import Config from "@miz/ai/config/config.toml";
import { UrlToBuffer, UrlToJson, UrlToText } from "@miz/ai/src/core/http";
import { ToJson } from "@miz/ai/src/core/util";
import { z } from "zod";

async function Suyanw(text: string) {
  const imageJson = await UrlToJson(Config.Image.suyanw.url + text);
  const imageSchema = z.object({
    data: z
      .array(
        z.object({
          imageurl: z.string().nullish(),
        })
      )
      .min(1),
  });
  const image = imageSchema.safeParse(imageJson);
  if (!image.success) return undefined;
  const imageList = image.data.data
    .filter(
      (image): image is { imageurl: string } =>
        typeof image.imageurl === "string" && image.imageurl.length > 0
    )
    .map((image) => image.imageurl);
  return imageList[Math.floor(Math.random() * imageList.length)];
}

async function Baidu(text: string) {
  const imageText = await UrlToText(
    Config.Image.baidu.url +
      new URLSearchParams({
        tn: "resultjson_com",
        word: text,
        pn: "1",
        rn: "10",
      })
  );
  if (!imageText) return undefined;
  const imageJson = ToJson(imageText.replace(/\u0001|\\[\S+]/g, ""));
  const imageSchema = z.object({
    data: z.array(z.object({ thumbURL: z.string().nullish() })).min(1),
  });
  const image = imageSchema.safeParse(imageJson);
  if (!image.success) return undefined;
  const imageList = image.data.data.filter(
    (image): image is { thumbURL: string } => !!image.thumbURL
  );
  if (!imageList.length) return undefined;
  const randomImage = imageList[Math.floor(Math.random() * imageList.length)];
  if (!randomImage) return undefined;
  return UrlToBuffer(randomImage.thumbURL);
}

export { Baidu, Suyanw };
