import config from "@miz/ai/config/config.toml";
import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources.mjs";

const deepseek = new OpenAI({
  apiKey: config.deepseek.key,
  baseURL: config.deepseek.url,
});

async function deepSeekChat(msg: ChatCompletionMessageParam[]) {
  return deepseek.chat.completions
    .create({
      messages: msg,
      ...config.ai.chat,
    })
    .then((chatCompletion) => chatCompletion.choices[0]?.message.content)
    .catch((_) => undefined);
}

export { deepSeekChat };
