import type { Part } from "@google/genai";
import { urlToBuffer } from "@miz/ai/src/core/http";
import { fileTypeFromBuffer } from "file-type";
import type { ChatCompletionContentPartImage } from "openai/resources";

function parseJson(str: string) {
  try {
    return JSON.parse(str);
  } catch (_) {
    return undefined;
  }
}

async function urlToGeminiImages(url: string) {
  const image = await urlToBuffer(url);
  if (!image) return undefined;
  const mime = await fileTypeFromBuffer(image);
  if (!mime) return undefined;
  return <Part>{
    inlineData: {
      mimeType: mime.mime,
      data: image.toBase64(),
    },
  };
}

async function urlToOpenAIImages(url: string) {
  const image = await urlToBuffer(url);
  if (!image) return undefined;
  const mime = await fileTypeFromBuffer(image);
  if (!mime) return undefined;
  return <ChatCompletionContentPartImage>{
    type: "image_url",
    image_url: {
      url: `data:${mime.mime};base64,${image.toBase64()}`,
    },
  };
}

function aiMessage(message: string) {
  return message
    .replace(/^(\n+)/g, "")
    .replace(/\n+/g, "\n")
    .replace(/\s*\*\s*/g, "*")
    .replace(/\*+/g, "*");
}

export { aiMessage, parseJson, urlToGeminiImages, urlToOpenAIImages };
