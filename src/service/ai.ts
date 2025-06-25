import {
  GoogleGenAI,
  type ContentListUnion,
  type ContentUnion,
} from "@google/genai";
import config from "@miz/ai/config/config.toml";
import { sleep } from "bun";
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

async function deepSeekChat(msg: ChatCompletionMessageParam[]) {
  return deepseek.chat.completions
    .create({
      messages: msg,
      ...config.ai.chat,
    })
    .then((chatCompletion) => chatCompletion.choices[0]?.message.content)
    .catch((_) => undefined);
}

async function geminiChat(content: ContentListUnion, prompt: ContentUnion) {
  for (let retry = config.gemini.retry; retry > 0; retry--) {
    const resp = await gemini.models
      .generateContent({
        model: config.gemini.model,
        contents: content,
        config: {
          systemInstruction: prompt,
          tools: [{ googleSearch: {} }],
          ...config.gemini.config,
        },
      })
      .then((v) => {
        if (v.candidates) return v.candidates[0]?.content?.parts;
        return undefined;
      })
      .catch((_) => undefined);
    if (resp) return resp;
    await sleep(config.gemini.retryDelay * 1000);
  }
  return undefined;
}

export { deepSeekChat, geminiChat };
