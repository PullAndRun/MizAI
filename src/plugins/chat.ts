import {
  FunctionCallingConfigMode,
  type Content,
  type FunctionCall,
  type Part,
} from "@google/genai";
import Config from "@miz/ai/config/config.toml";
import {
  Client,
  CommandText,
  GetMessage,
  SendGroupMessage,
} from "@miz/ai/src/core/bot";
import { UrlToBlob_2 } from "@miz/ai/src/core/http";
import { AIPartText, AIReply } from "@miz/ai/src/core/util";
import * as AIModel from "@miz/ai/src/models/ai.ts";
import { Deepseek, FunctionDeclarations, Gemini } from "@miz/ai/src/service/ai";
import { HotComment, ID } from "@miz/ai/src/service/music";
import {
  Structs,
  type GroupMessage,
  type Receive,
  type WSSendReturn,
} from "node-napcat-ts";
import type OpenAI from "openai";
import { z } from "zod";
const info = {
  name: "聊天=>无法调用",
  comment: [`内置AI聊天功能`],
  Plugin,
};

async function Plugin(event: GroupMessage) {
  const commandText = CommandText(event.raw_message, []);
  if (commandText.startsWith(Config.Bot.name)) {
    await DeepseekChat(event);
    return;
  }
  await GeminiChat(event);
}

async function GeminiParts(messages: Receive[keyof Receive][]) {
  const parts: Part[] = [];
  for (const message of messages) {
    if (message.type === "text") {
      parts.push({ text: message.data.text });
    }
    if (message.type === "image") {
      const urlToBlob_2 = await UrlToBlob_2(message.data.url);
      if (!urlToBlob_2) {
        parts.push({ text: `暂不支持的图片类型。` });
        continue;
      }
      parts.push({ inlineData: urlToBlob_2 });
    }
  }
  return parts;
}

async function GeminiContent(event: GroupMessage | WSSendReturn["get_msg"]) {
  const content: Content[] = [];
  const meta = (sender: string) => {
    return [
      `<metadata>`,
      `This is a group message`,
      `Sender's name: "${sender}"`,
      `</metadata>`,
    ];
  };
  for (const message of event.message) {
    if (message.type === "reply") {
      const getMessage = await GetMessage(Number.parseFloat(message.data.id));
      if (!getMessage) continue;
      const geminiParts = await GeminiParts(getMessage.message);
      if (!geminiParts.length) continue;
      content.push({
        role: "user",
        parts: [
          {
            text: meta(
              getMessage.sender.card || getMessage.sender.nickname
            ).join("\n"),
          },
          ...geminiParts,
        ],
      });
    }
  }
  const geminiParts = await GeminiParts(event.message);
  if (geminiParts.length) {
    content.push({
      role: "user",
      parts: [
        { text: meta(event.sender.card || event.sender.nickname).join("\n") },
        ...geminiParts,
      ],
    });
  }
  return content;
}

async function GeminiFunctionCall(event: GroupMessage) {
  const content = await GeminiContent(event);
  for (let retry = 0; retry < Config.AI.retry; retry++) {
    const gemini = await Gemini(content, `你将扮演${Config.Bot.nickname}`, {
      tools: [{ functionDeclarations: FunctionDeclarations() }],
      toolConfig: {
        functionCallingConfig: { mode: FunctionCallingConfigMode.ANY },
      },
      temperature: 0,
    });
    if (!gemini || !gemini.candidates) continue;
    if (!gemini.functionCalls || !gemini.functionCalls.length) break;
    for (const candidate of gemini.candidates) {
      if (!candidate.content) continue;
      content.push(candidate.content);
    }
    for (const functionCall of gemini.functionCalls) {
      if (functionCall.name === "get_music") {
        const music = await FunctionCallGetMuisc(event, functionCall);
        content.push({
          role: "user",
          parts: [
            {
              functionResponse: {
                name: functionCall.name,
                response: { music_name: music || "" },
              },
            },
          ],
        });
      }
      if (functionCall.name === "require_chat_history") {
        const historyContent = await FunctionCallGetChatHistory(
          event,
          content,
          Config.AI.history
        );
        content.unshift(...historyContent);
        content.push({
          role: "user",
          parts: [
            {
              functionResponse: {
                name: functionCall.name,
                response: functionCall.args,
              },
            },
          ],
        });
      }
    }
  }
  return content;
}

async function FunctionCallGetChatHistory(
  event: GroupMessage,
  content: Content[],
  count: number
) {
  const historyContent: Content[] = [];
  if (count === 0) return content;
  const chatHistory = await Client().get_group_msg_history({
    group_id: event.group_id,
    count,
  });
  for (const messages of chatHistory.messages) {
    const hc = await GeminiContent(messages);
    historyContent.push(...hc);
  }
  return historyContent.filter((hc) => {
    for (const ct of content) {
      if (JSON.stringify(ct.parts) === JSON.stringify(hc.parts)) return false;
    }
    return true;
  });
}

async function GeminiChat(event: GroupMessage) {
  const content = await GeminiFunctionCall(event);
  const normalHistoryContent = await FunctionCallGetChatHistory(
    event,
    content,
    Config.AI.chatHistory
  );
  content.unshift(...normalHistoryContent);
  const prompt = await AIModel.Find("gemini");
  if (!prompt) {
    await SendGroupMessage(event.group_id, [
      Structs.reply(event.message_id),
      Structs.text(`系统未录入迷子AI人格，请联系管理员。`),
    ]);
    return;
  }
  for (let retry = 0; retry < Config.AI.retry; retry++) {
    const gemini = await Gemini(content, prompt.prompt, {
      tools: [{ googleSearch: {} }],
    });
    if (
      !gemini ||
      !gemini.candidates ||
      !gemini.candidates.length ||
      !gemini.text
    )
      continue;
    for (const candidate of gemini.candidates) {
      if (!candidate.content || !candidate.content.parts) continue;
      for (const part of candidate.content.parts) {
        if (!part.text) continue;
        await SendGroupMessage(event.group_id, [
          Structs.reply(event.message_id),
          Structs.text(AIReply(part.text)),
        ]);
      }
    }
    break;
  }
}

async function FunctionCallGetMuisc(
  event: GroupMessage,
  functionCall: FunctionCall
) {
  const get_music_schema = z.object({
    args: z.object({
      music_name: z.string(),
    }),
  });
  const music = get_music_schema.safeParse(functionCall);
  if (!music.success) return undefined;
  const musicName = music.data.args.music_name;
  const id = await ID(musicName);
  if (!id) return undefined;
  const message = await SendGroupMessage(event.group_id, [
    Structs.music("163", id),
  ]);

  if (!message) return musicName;
  const hotComment = await HotComment(id);
  if (!hotComment) return musicName;
  await SendGroupMessage(event.group_id, [
    Structs.reply(message.message_id),
    Structs.text(hotComment),
  ]);
  return musicName;
}

async function DeepseekChat(event: GroupMessage) {
  const chatCompletionMessageParams: OpenAI.Chat.Completions.ChatCompletionMessageParam[] =
    [];
  for (const message of event.message) {
    if (message.type === "reply") {
      const getMessage = await GetMessage(Number.parseFloat(message.data.id));
      if (!getMessage) continue;
      for (const message of getMessage.message) {
        if (message.type === "text") {
          chatCompletionMessageParams.push({
            role: "user",
            content: [{ type: "text", text: AIPartText(message.data.text) }],
          });
        }
      }
      continue;
    }
    if (message.type === "text") {
      chatCompletionMessageParams.push({
        role: "user",
        content: [{ type: "text", text: AIPartText(message.data.text) }],
      });
    }
  }
  const deepseek = await Deepseek(chatCompletionMessageParams);
  if (!deepseek) {
    await SendGroupMessage(event.group_id, [
      Structs.reply(event.message_id),
      Structs.text(`机器人cpu过热\n请稍候重试。`),
    ]);
    return;
  }
  for (const message of deepseek.choices) {
    const content = message.message.content;
    if (!content) continue;
    await SendGroupMessage(event.group_id, [
      Structs.reply(event.message_id),
      Structs.text(AIReply(content)),
    ]);
  }
}

export { info };
