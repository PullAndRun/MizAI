import Config from "miz/config/config.toml";
import { Menu, Message, SendGroupMessage } from "miz/src/core/bot";
import { Duplicate, Finance, Hot } from "miz/src/service/news";
import { Structs, type GroupMessage } from "node-napcat-ts";

const info = {
  name: "新闻",
  comment: [
    `使用 "新闻 头条" 命令查看当前头条新闻`,
    `使用 "新闻 财经" 命令查看当前财经新闻`,
  ],
  Plugin,
};

async function Plugin(event: GroupMessage) {
  const message = Message(event.message, [Config.Bot.name, info.name]);
  const menu: Menu = [
    {
      command: "头条",
      comment: `使用 "新闻 头条" 命令查看当前头条新闻`,
      role: "member",
      plugin: HotNews,
    },
    {
      command: "财经",
      comment: `使用 "新闻 财经" 命令查看当前财经新闻`,
      role: "member",
      plugin: FinanceNews,
    },
  ];
  await Menu(event, message, menu);
}

async function HotNews(_: string, event: GroupMessage) {
  await SendNews(event, Hot, "热点新闻");
}

async function FinanceNews(_: string, event: GroupMessage) {
  await SendNews(event, Finance, "财经新闻");
}

async function SendNews(
  event: GroupMessage,
  News: () => Promise<Array<{ title: string; content: string }> | undefined>,
  newsType: string
) {
  const news = await News();
  if (!news) {
    await SendGroupMessage(event.group_id, [
      Structs.reply(event.message_id),
      Structs.text(`获取${newsType}失败,请稍后再试。`),
    ]);
    return;
  }
  const newNews = await Duplicate(
    event.group_id,
    news,
    Config.News.realtime.quantity
  );
  if (!newNews || !newNews.length) {
    await SendGroupMessage(event.group_id, [
      Structs.reply(event.message_id),
      Structs.text(`暂时没有新的${newsType}。`),
    ]);
    return;
  }
  await SendGroupMessage(event.group_id, [
    Structs.reply(event.message_id),
    Structs.text(
      `为您播报${newsType}:\n\n` +
        newNews
          .map((v, i) => `${i + 1}、${v.title}\n=>${v.content}`)
          .join("\n\n")
    ),
  ]);
}

export { info };
