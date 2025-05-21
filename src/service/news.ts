import config from "@miz/ai/config/config.toml";
import { z } from "zod";

const newsMap: Map<number, Array<string>> = new Map();
async function fetchFinance() {
  const finance = await fetch(config.news.finance, {
    signal: AbortSignal.timeout(5000),
  })
    .then((resp) => resp.json())
    .catch((_) => undefined);
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
  const financeData = financeSchema.safeParse(finance);
  if (!financeData.success) return undefined;
  return financeData.data.Result.content.list
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

async function fetchHot() {
  const hot = await fetch(config.news.hot, {
    signal: AbortSignal.timeout(5000),
  })
    .then((res) => res.json())
    .catch((_) => undefined);
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
  const hotData = hotSchema.safeParse(hot);
  if (!hotData.success) return undefined;
  return hotData.data.data.cards[0]?.content
    .map((res) => {
      if (!res.desc || !res.query) return undefined;
      return {
        title: res.query,
        content: res.desc,
      };
    })
    .filter((res) => res !== undefined);
}

async function duplicate(
  gid: number,
  news: Array<{ title: string; content: string }>
) {
  const newsItem = newsMap.get(gid) || [];
  const newNews = news.filter(
    (v, i) => !newsItem.includes(v.title) && i < config.news.items
  );
  if (!newNews.length) return undefined;
  const newNewsTitles = newNews.map((v) => v.title);
  newsMap.set(gid, [...newsItem, ...newNewsTitles]);
  return newNews;
}

export { duplicate, fetchFinance, fetchHot, newsMap };
