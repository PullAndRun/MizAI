import Config from "@miz/ai/config/config.toml";
import { z } from "zod";
import { UrlToJson } from "../core/http";

const newsMap: Map<number, Array<string>> = new Map();

async function Finance() {
  const financeJson = await UrlToJson(Config.news.finance.url);
  const financeSchema = z.object({
    Result: z.object({
      content: z.object({
        list: z
          .array(
            z.object({
              title: z.string().nullish(),
              content: z.object({
                items: z.array(z.object({ data: z.string() })).min(1),
              }),
            })
          )
          .min(1),
      }),
    }),
  });
  const finance = financeSchema.safeParse(financeJson);
  if (!finance.success) return undefined;
  return finance.data.Result.content.list
    .map((v) => {
      const content = v.content.items
        .map((vv) => {
          if (!v.title || !vv.data) return undefined;
          if (vv.data.replace(/。/g, "") === v.title.replace(/。/g, ""))
            return "快讯内容同标题";
          return vv.data;
        })
        .filter((v) => v !== undefined);
      if (!content.length) return undefined;
      return {
        title: v.title || "本快讯无标题",
        content: content.join("\n"),
      };
    })
    .filter((res) => res !== undefined);
}

async function Hot() {
  const hotJson = await UrlToJson(Config.News.hot.url);
  const hotSchema = z.object({
    data: z.object({
      cards: z
        .array(
          z.object({
            content: z
              .array(
                z.object({
                  desc: z.string(),
                  query: z.string(),
                })
              )
              .min(1),
          })
        )
        .min(1),
    }),
  });
  const hot = hotSchema.safeParse(hotJson);
  if (!hot.success) return undefined;
  return hot.data.data.cards[0]?.content
    .map((res) => {
      if (!res.desc || !res.query) return undefined;
      return {
        title: res.query,
        content: res.desc,
      };
    })
    .filter((res) => res !== undefined);
}

async function Duplicate(
  groupID: number,
  newsList: Array<{ title: string; content: string }>,
  lines: number
) {
  const oldNewsList = newsMap.get(groupID) || [];
  const newNewsList = newsList.filter(
    (v, i) => !oldNewsList.includes(v.title) && i < lines
  );
  if (!newNewsList.length) return undefined;
  const newNewsTitlesList = newNewsList.map((v) => v.title);
  newsMap.set(groupID, [...oldNewsList, ...newNewsTitlesList]);
  return newNewsList;
}

export { Duplicate, Finance, Hot, newsMap };
