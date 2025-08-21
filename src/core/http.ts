import { fileTypeFromBuffer } from "file-type";

async function UrlToJson(
  url: string,
  headers?: Bun.HeadersInit,
  option?: RequestInit
) {
  return fetch(url, { signal: AbortSignal.timeout(5000), headers, ...option })
    .then(async (res) => res.json())
    .catch((_) => undefined);
}

async function UrlToBuffer(url: string, headers?: Bun.HeadersInit) {
  return fetch(url, { signal: AbortSignal.timeout(5000), headers })
    .then(async (res) => Buffer.from(await res.arrayBuffer()))
    .catch((_) => undefined);
}

async function UrlToText(url: string, headers?: Bun.HeadersInit) {
  return fetch(url, { signal: AbortSignal.timeout(5000), headers })
    .then(async (res) => res.text())
    .catch((_) => undefined);
}

async function BufferToBlob_2(buffer: Buffer) {
  const fileType = await fileTypeFromBuffer(buffer);
  if (!fileType) return undefined;
  const geminiImageType = [
    "image/png",
    "image/jpeg",
    "image/webp",
    "image/heic",
    "image/heif",
  ];
  if (!geminiImageType.includes(fileType.mime)) return undefined;
  return {
    mimeType: fileType.mime,
    data: buffer.toBase64(),
  };
}

async function UrlToBlob_2(url: string) {
  const buffer = await UrlToBuffer(url);
  if (!buffer) return undefined;
  return BufferToBlob_2(buffer);
}

export { BufferToBlob_2, UrlToBlob_2, UrlToBuffer, UrlToJson, UrlToText };
