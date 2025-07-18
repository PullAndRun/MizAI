import {
  GoogleGenAI,
  Type,
  type ContentListUnion,
  type ContentUnion,
  type FunctionDeclaration,
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
    .catch((_) => undefined);
}

function FunctionDeclarations() {
  const getImages: FunctionDeclaration = {
    name: "get_images",
    description:
      "解析用户请求并调用图片搜索功能。返回图片名称。用户让你找图、搜图、作图、用户想看图等类似需求，都应使用图片搜索功能。",
    parameters: {
      type: Type.OBJECT,
      properties: {
        image_name: {
          type: Type.ARRAY,
          description: "图片名称。",
        },
      },
      required: ["image_name"],
    },
  };
  const getMuisc: FunctionDeclaration = {
    name: "get_music",
    description:
      "解析用户请求并调用音乐搜索功能。返回音乐名称。音乐名称可能包含歌手名称。",
    parameters: {
      type: Type.OBJECT,
      properties: {
        music_name: {
          type: Type.STRING,
          description: "音乐名称。",
        },
      },
      required: ["music_name"],
    },
  };
  const getGroupChatHistory = {
    name: "require_chat_history",
    description:
      "判断是否需要读取群聊记录来回答当前问题，当问题涉及之前的讨论内容、需要上下文理解、或包含模糊指代时返回true",
    parameters: {
      type: Type.OBJECT,
      properties: {
        need_history: {
          type: Type.BOOLEAN,
          description: "当且仅当必须通过查看历史消息才能正确回答问题时为true",
        },
      },
      required: ["need_history"],
    },
  };
  return [getImages, getGroupChatHistory, getMuisc];
}

export { Deepseek, FunctionDeclarations, Gemini };
