import { GoogleGenAI, type Part } from "@google/genai";
import config from "@miz/ai/config/config.toml";
import { fileTypeFromBuffer } from "file-type";
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

async function explain(bfs: Array<Buffer<ArrayBuffer>>, prompt: string) {
  const parts: Part[] = [];
  for (const bf of bfs) {
    const mime = await fileTypeFromBuffer(bf);
    if (!mime) continue;
    parts.push({
      inlineData: {
        mimeType: mime.mime,
        data: bf.toBase64(),
      },
    });
  }
  if (!parts.length) return undefined;
  return gemini.models
    .generateContent({
      model: config.gemini.model,
      contents: [
        {
          role: "user",
          parts: parts,
        },
      ],
      config: {
        systemInstruction: prompt,
        tools: [{ googleSearch: {} }],
        ...config.gemini.config,
      },
    })
    .then((v) => v.text)
    .catch((_) => undefined);
}

export { deepSeekChat, explain };
