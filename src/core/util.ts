import type { Part } from "@google/genai";
import { urlToBuffer } from "@miz/ai/src/core/http";
import { fileTypeFromBuffer } from "file-type";

function parseJson(str: string) {
  try {
    return JSON.parse(str);
  } catch (_) {
    return undefined;
  }
}

async function urlToParts(url: string) {
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

export { parseJson, urlToParts };
