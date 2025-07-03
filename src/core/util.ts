import { urlToBuffer } from "@miz/ai/src/core/http";
import { fileTypeFromBuffer } from "file-type";

function parseJson(str: string) {
  try {
    return JSON.parse(str);
  } catch (_) {
    return undefined;
  }
}

async function urlToBlob_2(url: string) {
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

async function bufferToBlob_2(buffer: Buffer) {
  const mime = await fileTypeFromBuffer(buffer);
  if (!mime) return undefined;
  if (mime.mime === "image/gif") return undefined;
  return {
    mimeType: mime.mime,
    data: buffer.toBase64(),
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

export { aiMessage, bufferToBlob_2, parseJson, urlToBlob_2 };
