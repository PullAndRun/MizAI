import config from "@miz/ai/config/config.toml";
import { urlToBuffer, urlToJson } from "@miz/ai/src/core/http";
import { z } from "zod";

async function suyanwSearch(text: string) {
  const json = await urlToJson(config.image.suyanw + text);
  const schema = z.object({
    data: z
      .array(
        z.object({
          imageurl: z.string().nullish(),
        })
      )
      .min(1),
  });
  const safe = schema.safeParse(json);
  if (!safe.success) return undefined;
  const images = safe.data.data
    .filter(
      (v): v is { imageurl: string } =>
        typeof v.imageurl === "string" && v.imageurl.length > 0
    )
    .map((v) => v.imageurl);
  return images[Math.floor(Math.random() * images.length)];
}

async function baiduSearch(text: string) {
  const fetchImageInfo = await fetch(
    config.image.baidu +
      new URLSearchParams({
        tn: "resultjson_com",
        word: text,
        pn: "1",
        rn: "10",
      }),
    {
      signal: AbortSignal.timeout(5000),
    }
  )
    .then(async (res) => res.json())
    .catch((_) => undefined);
  if (!fetchImageInfo) return undefined;
  const imageInfoSchema = z.object({
    data: z.array(z.object({ thumbURL: z.string().nullish() })).min(1),
  });
  const safeImageInfo = imageInfoSchema.safeParse(fetchImageInfo);
  if (!safeImageInfo.success) return undefined;
  const images = safeImageInfo.data.data.filter(
    (url): url is { thumbURL: string } => !!url.thumbURL
  );
  if (!images.length) return undefined;
  const randomImage = images[Math.floor(Math.random() * images.length)];
  if (!randomImage) return undefined;
  return urlToBuffer(randomImage.thumbURL);
}

export { baiduSearch, suyanwSearch };
