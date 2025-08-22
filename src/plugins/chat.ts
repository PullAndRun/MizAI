import {
  FunctionCallingConfigMode,
  type Content,
  type Part,
} from "@google/genai";
import Config from "@miz/ai/config/config.toml";
import {
  CommandText,
  GetMessage,
  SendGroupMessage,
} from "@miz/ai/src/core/bot";
import {
  ChatHistory,
  FunctionDeclarations,
} from "@miz/ai/src/core/functionCall";
import { UrlToBlob_2 } from "@miz/ai/src/core/http";
import { AIPartText, AIReply, GroupPrompt } from "@miz/ai/src/core/util";
import { Deepseek, Gemini } from "@miz/ai/src/service/ai";
import { Structs, type GroupMessage, type WSSendReturn } from "node-napcat-ts";
import type OpenAI from "openai";

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

async function GeminiGroupContent(
  event:
    | GroupMessage
    | WSSendReturn["get_msg"]
    | {
        message: Array<{ type: "text"; data: { text: string } }>;
        sender: { card?: string; nickname?: string };
      }
) {
  const parts: Part[] = [];
  const meta = (sender: string) => {
    return [
      `<metadata>`,
      `This is a group message`,
      `Sender's name: "${sender}"`,
      `</metadata>`,
    ];
  };
  for (const message of event.message) {
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
    if (message.type === "reply") {
      const getMessage = await GetMessage(Number.parseFloat(message.data.id));
      if (!getMessage) continue;
      const replyParts = await GeminiGroupContent(getMessage);
      if (!replyParts) continue;
      parts.push(...replyParts.parts);
    }
  }
  if (!parts.length) return undefined;
  return {
    role: "user",
    parts: [
      {
        text: `${meta(
          event.sender.card || event.sender.nickname || "无名氏"
        ).join("\n")}`,
      },
      ...parts,
    ],
  };
}

async function GeminiFunctionCall(event: GroupMessage, content: Content[]) {
  for (let retry = 0; retry < Config.AI.retry; retry++) {
    const gemini = await Gemini(
      content,
      `你将扮演${Config.Bot.nickname}`,
      {
        tools: [{ functionDeclarations: FunctionDeclarations() }],
        toolConfig: {
          functionCallingConfig: { mode: FunctionCallingConfigMode.ANY },
        },
        temperature: 0,
      },
      "gemini-2.5-flash-lite"
    );
    if (!gemini || !gemini.candidates) continue;
    if (!gemini.functionCalls || !gemini.functionCalls.length) break;
    for (const candidate of gemini.candidates) {
      if (!candidate.content || !candidate.content.parts) continue;
      content.push(candidate.content);
    }
    const partList: Part[] = [];
    for (const functionCall of gemini.functionCalls) {
      if (functionCall.name === "require_chat_history") {
        const chatHistory = await ChatHistory(
          event,
          content,
          Config.AI.history
        );
        content.unshift(...chatHistory);
        partList.push({
          functionResponse: {
            name: functionCall.name,
            response: functionCall.args,
          },
        });
      }
    }
    if (partList.length) {
      content.push({
        role: "user",
        parts: partList,
      });
    }
  }
}

async function GeminiChat(event: GroupMessage) {
  const content: Content[] = [];
  const geminiGroupContent = await GeminiGroupContent(event);
  if (!geminiGroupContent) return;
  content.push(geminiGroupContent);
  const groupPrompt = await GroupPrompt(event.group_id);
  if (!groupPrompt) {
    await SendGroupMessage(event.group_id, [
      Structs.reply(event.message_id),
      Structs.text(`系统未录入迷子AI人格，请联系管理员。`),
    ]);
    return;
  }
  await GeminiFunctionCall(event, content);
  for (let retry = 0; retry < Config.AI.retry; retry++) {
    const gemini = await Gemini(content, groupPrompt, {
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

export { GeminiGroupContent, info };
