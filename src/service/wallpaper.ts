import config from "@miz/ai/config/config.toml";
import { urlToBuffer } from "@miz/ai/src/core/http";
import { z } from "zod";

const imageInfo: { image: Buffer<ArrayBuffer> | undefined; copyright: string } =
  { image: undefined, copyright: "" };

async function wallpaper() {
  const image = await fetch(config.wallpaper.url, {
    signal: AbortSignal.timeout(5000),
  })
    .then((resp) => resp.json())
    .catch((_) => undefined);
  const imageSchema = z.object({
    url: z.string(),
    copyright: z.string(),
  });
  const imageData = imageSchema.safeParse(image);
  if (!imageData.success) return undefined;
  const imageResult = imageData.data;
  if (!imageInfo.image || imageInfo.copyright !== imageResult.copyright) {
    imageInfo.image = await urlToBuffer(imageResult.url);
    imageInfo.copyright = imageResult.copyright;
  }
  return imageInfo;
}

export { wallpaper };
