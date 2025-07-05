import Config from "@miz/ai/config/config.toml";
import { UrlToText } from "@miz/ai/src/core/http";
import dayjs from "dayjs";
import { XMLParser } from "fast-xml-parser";
import { z } from "zod";

async function Earthquake(level: number) {
  const earthquakeXML = await UrlToText(Config.Earthquake.url);
  if (!earthquakeXML) return undefined;
  const parser = new XMLParser();
  const earthquakeJson = parser.parse(earthquakeXML);
  const earthquakeSchema = z.object({
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
  const earthquake = earthquakeSchema.safeParse(earthquakeJson);
  if (!earthquake.success) return undefined;
  const earthquakeList = earthquake.data.rss.channel.item.filter((v) => {
    //过滤出a.b级地震的a
    const earthquakeLevel = v.title.match(/\d+(?=\.\d+)/);
    return !(!earthquakeLevel || Number.parseFloat(earthquakeLevel[0]) < level);
  });
  if (!earthquakeList.length) return undefined;
  return earthquakeList;
}

function EarthquakeReply(earthquakeData: {
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

export { Earthquake, EarthquakeReply };
