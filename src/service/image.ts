import config from "@miz/ai/config/config.toml";
import { urlToJson } from "@miz/ai/src/core/http";
import { z } from "zod";

async function search(text: string) {
  const json = await urlToJson(config.image.url + text);
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

export { search };
