import Config from "@miz/ai/config/config.toml";
import { Client, SendGroupMessage } from "@miz/ai/src/core/bot";
import * as GroupModel from "@miz/ai/src/models/group";
import * as PluginModel from "@miz/ai/src/models/plugin";
import { Duplicate, Finance, Hot, newsMap } from "@miz/ai/src/service/news";
import { sleep } from "bun";
import { Structs } from "node-napcat-ts";
import schedule from "node-schedule";

async function Send(
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
  const duplicate = await Duplicate(groupId, news, lines);
  if (!duplicate || !duplicate.length) return;
  await SendGroupMessage(groupId, [
    Structs.text(
      `${newsType}\n\n` +
        duplicate
          .map((v, i) => `${i + 1}、${v.title}\n=>${v.content}`)
          .join("\n\n")
    ),
  ]);
}

function Clean() {
  newsMap.forEach((news, groupID) => {
    if (news.length >= Config.News.clean.limit) {
      newsMap.set(groupID, news.slice(news.length / 2));
    }
  });
}

async function Realtime() {
  const groups = await Client().get_group_list();
  const hotNews = await Hot();
  const financeNews = await Finance();
  if ((!hotNews || !hotNews.length) && (!financeNews || !financeNews.length))
    return;
  for (const group of groups) {
    const findGroup = await GroupModel.FindOrAdd(group.group_id);
    if (!findGroup || !findGroup.active) continue;
    const lock = await PluginModel.FindOrAdd(group.group_id, "新闻推送", false);
    if (!lock || !lock.enable) continue;
    await Send(
      group.group_id,
      hotNews,
      "为您播报热点新闻",
      Config.News.realtime.quantity
    );
    await Send(
      group.group_id,
      financeNews,
      "为您播报财经新闻",
      Config.News.realtime.quantity
    );
    await sleep(Config.Bot.message_delay * 1000);
  }
}

async function Daily() {
  const groupList = await Client().get_group_list();
  const news = await Hot();
  if (!news || !news.length) return;
  for (const group of groupList) {
    const findGroup = await GroupModel.FindOrAdd(group.group_id);
    if (!findGroup || !findGroup.active) continue;
    const lock = await PluginModel.FindOrAdd(group.group_id, "每日新闻", true);
    if (!lock || !lock.enable) continue;
    await Send(
      group.group_id,
      news,
      "为您播报早间新闻",
      Config.News.daily.quantity
    );
    await sleep(Config.Bot.message_delay * 1000);
  }
}

function Task() {
  schedule.scheduleJob(Config.News.clean.spec, Clean);
  schedule.scheduleJob(Config.News.realtime.spec, Realtime);
  schedule.scheduleJob(Config.News.daily.spec, Daily);
}

export { Task };
