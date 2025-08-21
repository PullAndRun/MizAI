import {
  GoogleGenAI,
  type ContentListUnion,
  type ContentUnion,
  type GenerateContentConfig,
} from "@google/genai";
import Config from "@miz/ai/config/config.toml";
import OpenAI from "openai";

const deepseek = new OpenAI({
  apiKey: Config.Deepseek.key,
  baseURL: Config.Deepseek.url,
});

const gemini = new GoogleGenAI({
  apiKey: Config.Gemini.key,
  httpOptions: {
    baseUrl: Config.Gemini.url,
  },
});

async function Deepseek(
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[]
) {
  return deepseek.chat.completions
    .create({
      messages,
      model: Config.Deepseek.model,
      ...Config.Deepseek.config,
    })
    .catch((_) => undefined);
}

async function Gemini(
  contents: ContentListUnion,
  systemInstruction?: ContentUnion | undefined,
  config?: GenerateContentConfig
) {
  return gemini.models
    .generateContent({
      model: Config.Gemini.model,
      contents,
      config: {
        systemInstruction,
        ...Config.Gemini.config,
        ...config,
      },
    })
    .catch((e) => {
      console.log(e);
      return undefined;
    });
}

export { Deepseek, Gemini };
