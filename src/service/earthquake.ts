import Config from "@miz/ai/config/config.toml";
import { XMLParser } from "fast-xml-parser";
import { z } from "zod";
import dayjs from "dayjs";

async function FetchEarthquake(level: number) {
  const earthquake = await fetch(Config.Earthquake.url, {
    signal: AbortSignal.timeout(5000),
  })
    .then((res) => res.text())
    .catch((_) => undefined);
  if (!earthquake) return undefined;
  const parser = new XMLParser();
  let earthquakeObj = parser.parse(earthquake);
  const dynamicSchema = z.object({
    rss: z.object({
      channel: z.object({
        item: z
          .array(
            z.object({
              title: z.string(),
              description: z.string(),
              pubDate: z.string(),
              link: z.string(),
            })
          )
          .min(1),
      }),
    }),
  });
  const earthquakeData = dynamicSchema.safeParse(earthquakeObj);
  if (!earthquakeData.success) return undefined;
  const earthquakeItem = earthquakeData.data.rss.channel.item.filter((v) => {
    const earthquakeLevel = v.title.match(/\d+(?=\.\d+)/);
    return !(!earthquakeLevel || Number.parseFloat(earthquakeLevel[0]) < level);
  });
  if (!earthquakeItem.length) return undefined;
  return earthquakeItem;
}

function EarthquakeMsg(earthquakeData: {
  title: string;
  description: string;
  pubDate: string;
  link: string;
}) {
  return {
    text: `🌍【地震快讯】🌍\n📌 震情速递: "${
      earthquakeData.title
    }"\n💬 地震详情: ${earthquakeData.description}\n⏰ 地震时间: ${dayjs(
      earthquakeData.pubDate
    ).format("YYYY年MM月DD日 HH点mm分ss秒")}\n👉 官方讯息: ${
      earthquakeData.link
    }`,
  };
}

export { FetchEarthquake, EarthquakeMsg };
