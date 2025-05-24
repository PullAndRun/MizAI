import config from "@miz/ai/config/config.toml";
import { getClient, sendGroupMsg } from "@miz/ai/src/core/bot";
import { findOrAdd } from "@miz/ai/src/models/plugin";
import {
  duplicate,
  fetchFinance,
  fetchHot,
  newsMap,
} from "@miz/ai/src/service/news";
import { Structs } from "node-napcat-ts";
import schedule from "node-schedule";

async function newsTemplate(
  groupId: number,
  news:
    | Array<{
        title: string;
        content: string;
      }>
    | undefined,
  newsType: string,
  lines: number
) {
  if (!news) return;
  const newNews = await duplicate(groupId, news, lines);
  if (!newNews || !newNews.length) return;
  await sendGroupMsg(groupId, [
    Structs.text(
      `${newsType}:\n\n` +
        newNews
          .map((v, i) => `${i + 1}、${v.title}\n=>${v.content}`)
          .join("\n\n")
    ),
  ]);
}

function halfNewsMemory() {
  newsMap.forEach((news, gid) => {
    if (news.length >= 300) {
      newsMap.set(gid, news.slice(news.length / 2));
    }
  });
}

async function sendRealtimeNews() {
  const groups = await getClient().get_group_list();
  const hotNews = await fetchHot();
  const financeNews = await fetchFinance();
  for (const [_, group] of groups.entries()) {
    const lock = await findOrAdd(group.group_id, "新闻推送", false);
    if (!lock.enable) continue;
    await newsTemplate(
      group.group_id,
      financeNews,
      "为您推送财经头条",
      config.news.realTimeItems
    );
    await newsTemplate(
      group.group_id,
      hotNews,
      "为您推送热点新闻",
      config.news.realTimeItems
    );
  }
}

async function sendDailyNews() {
  const groupList = await getClient().get_group_list();
  const news = await fetchHot();
  if (!news) return;
  for (const group of groupList) {
    await newsTemplate(
      group.group_id,
      news,
      "为您推送早间新闻",
      config.news.dailyItems
    );
  }
}

function task() {
  schedule.scheduleJob(config.news.clean, halfNewsMemory);
  schedule.scheduleJob(config.news.realTime, sendRealtimeNews);
  schedule.scheduleJob(config.news.daily, sendDailyNews);
}

export { task };
