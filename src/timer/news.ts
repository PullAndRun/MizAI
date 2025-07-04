import config from "@miz/ai/config/config.toml";
import { getClient, sendGroupMsg } from "@miz/ai/src/core/bot";
import * as groupModel from "@miz/ai/src/models/group";
import * as pluginModel from "@miz/ai/src/models/plugin";
import {
  duplicate,
  fetchFinance,
  fetchHot,
  newsMap,
} from "@miz/ai/src/service/news";
import { sleep } from "bun";
import { Structs } from "node-napcat-ts";
import schedule from "node-schedule";

async function sendNews(
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

function cleanNews() {
  newsMap.forEach((news, gid) => {
    if (news.length >= 300) {
      newsMap.set(gid, news.slice(news.length / 2));
    }
  });
}

async function realtimeNews() {
  const groups = await getClient().get_group_list();
  const hotNews = await fetchHot();
  const financeNews = await fetchFinance();
  for (const group of groups) {
    const findGroup = await groupModel.findOrAdd(group.group_id);
    if (!findGroup.active) continue;
    const lock = await pluginModel.findOrAdd(group.group_id, "新闻推送", false);
    if (!lock.enable) continue;
    await sleep(config.bot.sleep * 1000);
    await sendNews(
      group.group_id,
      financeNews,
      "为您播报财经新闻",
      config.news.realtimeItems
    );
    await sendNews(
      group.group_id,
      hotNews,
      "为您播报热点新闻",
      config.news.realtimeItems
    );
  }
}

async function dailyNews() {
  const groupList = await getClient().get_group_list();
  const news = await fetchHot();
  if (!news) return;
  for (const group of groupList) {
    const findGroup = await groupModel.findOrAdd(group.group_id);
    if (!findGroup.active) continue;
    const lock = await pluginModel.findOrAdd(group.group_id, "每日新闻", true);
    if (!lock.enable) continue;
    await sleep(config.bot.sleep * 1000);
    await sendNews(
      group.group_id,
      news,
      "为您播报早间新闻",
      config.news.dailyItems
    );
  }
}

function task() {
  schedule.scheduleJob(config.news.cleanSpec, cleanNews);
  schedule.scheduleJob(config.news.realtimeSpec, realtimeNews);
  schedule.scheduleJob(config.news.dailySpec, dailyNews);
}

export { task };
