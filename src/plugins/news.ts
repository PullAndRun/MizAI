import config from "@miz/ai/config/config.toml";
import { cmd, cmdText, sendGroupMsg } from "@miz/ai/src/core/bot";
import { duplicate, fetchFinance, fetchHot } from "@miz/ai/src/service/news";
import { Structs, type GroupMessage } from "node-napcat-ts";

const info = {
  name: "新闻",
  comment: [
    `使用 "新闻 头条" 命令查看当前头条新闻`,
    `使用 "新闻 财经" 命令查看当前财经新闻`,
  ],
  plugin,
};

async function plugin(event: GroupMessage) {
  const msg = cmdText(event.raw_message, [config.bot.name, info.name]);
  const cmdList: commandList = [
    {
      cmd: "头条",
      cmt: `使用 "新闻 头条" 命令查看当前头条新闻`,
      role: "member",
      plugin: hotNews,
    },
    {
      cmd: "财经",
      cmt: `使用 "新闻 财经" 命令查看当前财经新闻`,
      role: "member",
      plugin: financeNews,
    },
  ];
  await cmd(msg, event, cmdList);
}

async function hotNews(_: string, event: GroupMessage) {
  await sendNews(event, fetchHot, "热点新闻");
}

async function financeNews(_: string, event: GroupMessage) {
  await sendNews(event, fetchFinance, "财经新闻");
}

async function sendNews(
  event: GroupMessage,
  fetchFunction: () => Promise<
    Array<{ title: string; content: string }> | undefined
  >,
  newsType: string
) {
  const news = await fetchFunction();
  if (!news) {
    await sendGroupMsg(event.group_id, [
      Structs.reply(event.message_id),
      Structs.text(`获取${newsType}失败,请稍后再试。`),
    ]);
    return;
  }
  const newNews = await duplicate(
    event.group_id,
    news,
    config.news.RealtimeItems
  );
  if (!newNews || !newNews.length) {
    await sendGroupMsg(event.group_id, [
      Structs.reply(event.message_id),
      Structs.text(`暂时没有新的${newsType}。`),
    ]);
    return;
  }
  await sendGroupMsg(event.group_id, [
    Structs.reply(event.message_id),
    Structs.text(
      `为您推送${newsType}:\n\n` +
        newNews
          .map((v, i) => `${i + 1}、${v.title}\n=>${v.content}`)
          .join("\n\n")
    ),
  ]);
}

export { info };
