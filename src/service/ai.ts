import {
  FunctionCallingConfigMode,
  GoogleGenAI,
  Type,
  type ContentListUnion,
  type ContentUnion,
  type FunctionDeclaration,
  type GenerateContentConfig,
  type ToolListUnion,
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
  tools?: ToolListUnion | undefined,
  config?: GenerateContentConfig
) {
  return gemini.models
    .generateContent({
      model: Config.Gemini.model,
      contents,
      config: {
        systemInstruction,
        toolConfig: {
          functionCallingConfig: { mode: FunctionCallingConfigMode.ANY },
        },
        ...Config.Gemini.config,
        tools,
        ...config,
      },
    })
    .catch((_) => undefined);
}

function FunctionDeclarations() {
  const getImages: FunctionDeclaration = {
    name: "get_images",
    description: "Get image name and quantity.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        image_quantity: {
          type: Type.NUMBER,
          description: `Image quantity from 1 to ${Config.AI.max_image}, 1 is default quantity and ${Config.AI.max_image} is max quantity. If quantity is greater than ${Config.AI.max_image}, quantity is ${Config.AI.max_image}.`,
        },
        image_name: {
          type: Type.STRING,
          minLength: "1",
          description: "Image name. Translate to Chinese.",
        },
      },
      required: ["image_name", "image_quantity"],
    },
  };
  const search: FunctionDeclaration = {
    name: "search",
    description:
      "When the model is unable to provide accurate answers, it automatically triggers a search engine to generate search queries.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        search_queries: {
          type: Type.STRING,
          description: "search queries. Translate to Chinese.",
        },
      },
      required: ["search_queries"],
    },
  };
  return [getImages, search];
}

export { Deepseek, FunctionDeclarations, Gemini };
