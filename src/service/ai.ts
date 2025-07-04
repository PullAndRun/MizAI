import {
  GoogleGenAI,
  Type,
  type ContentListUnion,
  type ContentUnion,
  type FunctionDeclaration,
} from "@google/genai";
import config from "@miz/ai/config/config.toml";
import { logger } from "@miz/ai/src/core/log";
import OpenAI from "openai";

const deepseek = new OpenAI({
  apiKey: config.deepseek.key,
  baseURL: config.deepseek.url,
});

const gemini = new GoogleGenAI({
  apiKey: config.gemini.key,
  httpOptions: {
    baseUrl: config.gemini.url,
  },
});

async function deepSeekChat(
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[]
) {
  return deepseek.chat.completions
    .create({
      messages,
      ...config.deepseek.config,
    })
    .catch((_) => undefined);
}

async function geminiChat(
  contents: ContentListUnion,
  systemInstruction?: ContentUnion | undefined,
  functionDeclarations?: FunctionDeclaration[] | undefined
) {
  return gemini.models
    .generateContent({
      model: config.gemini.model,
      contents,
      config: {
        systemInstruction,
        tools: [{ functionDeclarations }],
        ...config.gemini.config,
      },
    })
    .catch((_) => undefined);
}

function functionDeclarations() {
  const image: FunctionDeclaration = {
    name: "get_image",
    description: "使用搜索引擎根据图片名称搜索图片。",
    parameters: {
      type: Type.OBJECT,
      properties: {
        imageName: {
          type: Type.ARRAY,
          description: "供搜索的图片名称",
        },
      },
      required: ["imageName"],
    },
  };
  return [image];
}

export { deepSeekChat, geminiChat };
