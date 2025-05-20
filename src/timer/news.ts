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

async function taskSendNews(
  groupId: number,
  news:
    | Array<{
        title: string;
        content: string;
      }>
    | undefined,
  newsType: string
) {
  if (!news) return;
  const newNews = await duplicate(groupId, news);
  if (!newNews || !newNews.length) return;
  await sendGroupMsg(groupId, [
    Structs.text(
      `为您推送${newsType}:\n\n` +
        newNews
          .map((v, i) => `${i + 1}、${v.title}\n=>${v.content}`)
          .join("\n\n")
    ),
  ]);
}
function task() {
  schedule.scheduleJob(`0 0 0 */1 * *`, () => {
    newsMap.forEach((news, gid) => {
      if (news.length >= 300) {
        newsMap.set(gid, news.slice(news.length / 2));
      }
    });
  });
  schedule.scheduleJob(`0 */2 * * * *`, async () => {
    const groups = await getClient().get_group_list();
    const hotNews = await fetchHot();
    const financeNews = await fetchFinance();
    for (const [_, group] of groups.entries()) {
      const lock = await findOrAdd(group.group_id, "新闻推送", false);
      if (!lock.enable) continue;
      await taskSendNews(group.group_id, financeNews, "财经新闻");
      await taskSendNews(group.group_id, hotNews, "热点新闻");
    }
  });
}

export { task };
