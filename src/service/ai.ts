import { GoogleGenAI, type ContentListUnion } from "@google/genai";
import config from "@miz/ai/config/config.toml";
import { logger } from "@miz/ai/src/core/log";
import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources.mjs";

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
  message: ChatCompletionMessageParam[],
  prompt?: string
) {
  const messages: ChatCompletionMessageParam[] = [];
  if (prompt) {
    messages.push({ role: "system", content: prompt });
  }
  messages.push(...message);
  return deepseek.chat.completions
    .create({
      messages: messages,
      ...config.deepseek.config,
    })
    .then((chatCompletion) => chatCompletion.choices[0]?.message.content)
    .catch((_) => undefined);
}

async function geminiChat(message: ContentListUnion, prompt?: string) {
  return gemini.models
    .generateContent({
      model: config.gemini.model,
      contents: message,
      config: {
        systemInstruction: prompt,
        tools: [{ googleSearch: {} }],
        ...config.gemini.config,
      },
    })
    .catch((e) => {
      logger.warn(e);
      return undefined;
    });
}

export { deepSeekChat, geminiChat };
