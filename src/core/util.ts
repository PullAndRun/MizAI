import { urlToBuffer } from "@miz/ai/src/core/http";
import { fileTypeFromBuffer } from "file-type";

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
  return {
    mimeType: mime.mime,
    data: image.toBase64(),
  };
}

function aiMessage(message: string) {
  return message
    .replace(/^(\n+)/g, "")
    .replace(/\n+/g, "\n")
    .replace(/ *\* */g, "*")
    .replace(/\*+/g, " * ")
    .replace(/ *\# */g, "#")
    .replace(/\#+/g, "#")
    .trim();
}

export { aiMessage, parseJson, urlToOpenAIImages };
