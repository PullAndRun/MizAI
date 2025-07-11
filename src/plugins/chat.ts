import type { Content, FunctionCall } from "@google/genai";
import Config from "@miz/ai/config/config.toml";
import {
  CommandText,
  GetMessage,
  SendGroupMessage,
} from "@miz/ai/src/core/bot";
import { BufferToBlob_2 } from "@miz/ai/src/core/http";
import { AIPartText, AIReply } from "@miz/ai/src/core/util";
import * as AIModel from "@miz/ai/src/models/ai.ts";
import { Deepseek, FunctionDeclarations, Gemini } from "@miz/ai/src/service/ai";
import { Baidu } from "@miz/ai/src/service/image";
import { sleep } from "bun";
import { Structs, type GroupMessage } from "node-napcat-ts";
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
  if (commandText.includes(Config.Bot.nickname)) {
    await GeminiChat(event);
    return;
  }
}

async function GeminiChat(event: GroupMessage) {
  const content: Content[] = [];
  for (const message of event.message) {
    if (message.type === "text") {
      content.push({ role: "user", parts: [{ text: message.data.text }] });
    }
  }
  const prompt = await AIModel.Find("gemini");
  if (!prompt) {
    await SendGroupMessage(event.group_id, [
      Structs.reply(event.message_id),
      Structs.text(`系统未录入迷子AI人格，请联系管理员。`),
    ]);
    return;
  }
  let count = Config.AI.count;
  while (true) {
    if (count === 0) break;
    const gemini = await Gemini(content, prompt.prompt, [
      { functionDeclarations: FunctionDeclarations() },
    ]);
    if (!gemini) {
      await SendGroupMessage(event.group_id, [
        Structs.reply(event.message_id),
        Structs.text(`机器人cpu过热\n请稍候重试。`),
      ]);
      return;
    }
    if (!gemini.candidates) continue;
    for (const candidate of gemini.candidates) {
      if (!candidate.content || !candidate.content.parts) continue;
      content.push(candidate.content);
      for (const part of candidate.content.parts) {
        if (!part.text) continue;
        await SendGroupMessage(event.group_id, [
          Structs.reply(event.message_id),
          Structs.text(AIReply(part.text)),
        ]);
      }
    }
    if (!gemini.functionCalls || !gemini.functionCalls.length) break;
    for (const functionCall of gemini.functionCalls) {
      if (functionCall.name === "get_images") {
        await FunctionCallGetImages(event, functionCall);
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
      if (functionCall.name === "search") {
        const search_results = await FunctionCallGoogleSearch(functionCall);
        content.push({
          role: "user",
          parts: [
            {
              functionResponse: {
                name: functionCall.name,
                response: { search_results: search_results || "搜索失败" },
              },
            },
          ],
        });
      }
    }
    count--;
  }
}

async function FunctionCallGoogleSearch(functionCall: FunctionCall) {
  const search_schema = z.object({
    args: z.object({ search_queries: z.string() }),
  });
  const search = search_schema.safeParse(functionCall);
  if (!search.success) return undefined;
  const gemini = await Gemini(
    {
      role: "user",
      parts: [{ text: search.data.args.search_queries }],
    },
    undefined,
    [{ googleSearch: {} }],
    { temperature: 0 }
  );
  if (!gemini) return undefined;
  return gemini.text;
}

async function FunctionCallGetImages(
  event: GroupMessage,
  functionCall: FunctionCall
) {
  const get_images_schema = z.object({
    args: z.object({
      image_name: z.string(),
      image_quantity: z.number(),
    }),
  });
  const image = get_images_schema.safeParse(functionCall);
  if (!image.success) return;
  for (let i = 0; i < image.data.args.image_quantity; i++) {
    const imageBuffer = await Baidu(image.data.args.image_name);
    if (!imageBuffer) continue;
    const blob_2 = await BufferToBlob_2(imageBuffer);
    const gemini = await Gemini(
      [
        {
          role: "user",
          parts: [{ text: "简略分析图像,100字以内" }, { inlineData: blob_2 }],
        },
      ],
      undefined,
      [{ googleSearch: {} }]
    );
    const texts = () => {
      if (!gemini || !gemini.candidates) return [Structs.text("")];
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
    await sleep(Config.Bot.message_delay * 1000);
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

export { info };
