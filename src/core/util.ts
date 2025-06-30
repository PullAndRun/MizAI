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

async function urlToOpenAIImages(url: string) {
  const image = await urlToBuffer(url);
  if (!image) return undefined;
  const mime = await fileTypeFromBuffer(image);
  if (!mime) return undefined;
  if (mime.mime === "image/gif") return undefined;
  return <ChatCompletionContentPartImage>{
    type: "image_url",
    image_url: {
      url: `data:${mime.mime};base64,${image.toBase64()}`,
    },
  };
}

function aiMessage(message: string) {
  return message
    .replace(/^(\n+)|^[\s\S]*?<\/metadata>\s*|\[[^\]]*?\]/g, "")
    .replace(/\n+/g, "\n")
    .replace(/ *\* */g, "*")
    .replace(/\*+/g, " * ")
    .replace(/ *\# */g, "#")
    .replace(/\#+/g, "#")
    .trim();
}

export { aiMessage, parseJson, urlToOpenAIImages };
