import config from "@miz/ai/config/config.toml";
import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources.mjs";
import { logger } from "../core/log";

const deepseek = new OpenAI({
  apiKey: config.deepseek.key,
  baseURL: config.deepseek.url,
});

const gemini = new OpenAI({
  apiKey: config.gemini.key,
  baseURL: config.gemini.url,
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

async function geminiChat(
  message: ChatCompletionMessageParam[],
  prompt?: string
) {
  const messages: ChatCompletionMessageParam[] = [];
  if (prompt) {
    messages.push({ role: "system", content: prompt });
  }
  messages.push(...message);
  return gemini.chat.completions
    .create({
      messages: messages,
      ...config.gemini.config,
      tools: [
        {
          type: "function",
          function: {
            name: "googleSearch",
          },
        },
      ],
    })
    .then((chatCompletion) => chatCompletion.choices[0]?.message.content)
    .catch((e) => {
      logger.error("gemini错误:\n" + e);
      return undefined;
    });
}

export { deepSeekChat, geminiChat };
