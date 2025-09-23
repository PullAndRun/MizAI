import Config from "miz/config/config.toml";
import { UrlToBuffer, UrlToJson } from "miz/src/core/http";
import { z } from "zod";

const imageInfo: { image: Buffer<ArrayBuffer> | undefined; copyright: string } =
  { image: undefined, copyright: "" };

async function Wallpaper() {
  const imageJson = await UrlToJson(Config.Wallpaper.url);
  const imageSchema = z.object({
    url: z.string(),
    copyright: z.string(),
  });
  const image = imageSchema.safeParse(imageJson);
  if (!image.success) return undefined;
  if (!imageInfo.image || imageInfo.copyright !== image.data.copyright) {
    imageInfo.image = await UrlToBuffer(image.data.url);
    imageInfo.copyright = image.data.copyright;
  }
  return imageInfo;
}

export { Wallpaper };
