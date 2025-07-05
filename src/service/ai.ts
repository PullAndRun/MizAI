import {
  GoogleGenAI,
  type ContentListUnion,
  type ContentUnion,
  type FunctionDeclaration,
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
  functionDeclarations?: FunctionDeclaration[] | undefined
) {
  return gemini.models
    .generateContent({
      model: Config.Gemini.model,
      contents,
      config: {
        systemInstruction,
        tools: [{ functionDeclarations }],
        ...Config.Gemini.config,
      },
    })
    .catch((_) => undefined);
}

export { Deepseek, Gemini };
