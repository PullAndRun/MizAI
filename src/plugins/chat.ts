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
import { BufferToBlob_2, UrlToBlob_2 } from "@miz/ai/src/core/http";
import { AIPartText, AIReply } from "@miz/ai/src/core/util";
import * as AIModel from "@miz/ai/src/models/ai.ts";
import { Deepseek, FunctionDeclarations, Gemini } from "@miz/ai/src/service/ai";
import { Baidu } from "@miz/ai/src/service/image";
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
  let content = await GeminiContent(event);
  for (let retry = 0; retry < Config.AI.retry; retry++) {
    const gemini = await Gemini(content, undefined, {
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
      if (functionCall.name === "get_images") {
        const images = await FunctionCallGetImages(event, functionCall);
        if (!images) {
          content.push({
            role: "user",
            parts: [
              {
                functionResponse: {
                  name: functionCall.name,
                  response: { image_name: [] },
                },
              },
            ],
          });
          continue;
        }
        content.push({
          role: "user",
          parts: [
            {
              functionResponse: {
                name: functionCall.name,
                response: { image_name: images },
              },
            },
          ],
        });
      }
      if (functionCall.name === "require_chat_history") {
        const historyContent = await FunctionCallGetChatHistory(event);
        const filteContent = historyContent.filter((historyContent) => {
          for (const ct of content) {
            if (
              JSON.stringify(ct.parts) === JSON.stringify(historyContent.parts)
            )
              return false;
          }
          return true;
        });
        content.unshift(...filteContent);
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

async function FunctionCallGetChatHistory(event: GroupMessage) {
  const content: Content[] = [];
  const history = await Client().get_group_msg_history({
    group_id: event.group_id,
    count: Config.AI.history,
  });
  for (const messages of history.messages) {
    const historyContent = await GeminiContent(messages);
    content.push(...historyContent);
  }
  return content;
}

async function GeminiChat(event: GroupMessage) {
  const content = await GeminiFunctionCall(event);
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
          Structs.text(part.text),
        ]);
      }
    }
    break;
  }
}

async function FunctionCallGetImages(
  event: GroupMessage,
  functionCall: FunctionCall
) {
  const get_images_schema = z.object({
    args: z.object({
      image_name: z.array(z.string()).min(1),
    }),
  });
  const image = get_images_schema.safeParse(functionCall);
  if (!image.success) return undefined;
  for (let imageName of image.data.args.image_name.filter(
    (_, i) => i < Config.AI.imageCount
  )) {
    const imageBuffer = await Baidu(imageName);
    if (!imageBuffer) return undefined;
    const blob_2 = await BufferToBlob_2(imageBuffer);
    if (!blob_2) return undefined;
    const gemini = await Gemini(
      [
        {
          role: "user",
          parts: [{ text: "简略分析图像,100字以内" }, { inlineData: blob_2 }],
        },
      ],
      undefined,
      { tools: [{ googleSearch: {} }] }
    );
    if (!gemini) return undefined;
    const texts = () => {
      if (!gemini.candidates || !gemini.candidates.length)
        return [Structs.text("")];
      const text: string[] = [];
      for (const candidate of gemini.candidates) {
        if (!candidate.content || !candidate.content.parts) continue;
        for (const part of candidate.content.parts) {
          if (!part.text) continue;
          text.push(AIReply(part.text));
        }
      }
      return text.map((v) => Structs.text(v));
    };
    await SendGroupMessage(event.group_id, [
      Structs.reply(event.message_id),
      Structs.image(imageBuffer),
      ...texts(),
    ]);
  }
  return image.data.args.image_name.slice(0, Config.AI.imageCount);
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
