import Config from "@miz/ai/config/config.toml";
import { UrlToBuffer, UrlToJson, UrlToText } from "@miz/ai/src/core/http";
import * as cheerio from "cheerio";
import dayjs from "dayjs";
import { XMLParser } from "fast-xml-parser";
import { z } from "zod";

async function Dynamic(memberID: number) {
  const dynamicText = await UrlToText(Config.Bili.dynamic.url + memberID);
  if (!dynamicText) return undefined;
  const parser = new XMLParser();
  const dynamicJson = parser.parse(dynamicText);
  const dynamicSchema = z.object({
    rss: z.object({
      channel: z.object({
        image: z.object({
          url: z.string(),
        }),
        item: z
          .array(
            z.object({
              title: z.string().or(z.number()).or(z.boolean()),
              description: z.string().or(z.number()).or(z.boolean()),
              pubDate: z.string(),
              link: z.string(),
              author: z.string(),
            })
          )
          .min(1),
      }),
    }),
  });
  const dynamic = dynamicSchema.safeParse(dynamicJson);
  if (!dynamic.success) return undefined;
  const items = dynamic.data.rss.channel.item.filter(
    (v) => !v.description.toString().includes("直播间地址：")
  );
  if (!items[0]) return undefined;
  const $ = cheerio.load(
    items[0].description
      .toString()
      .replace(/<br>/g, "\n")
      .replace(/图文地址：|视频地址：/g, "")
  );
  $("a").remove();
  const title =
    items[0].title
      .toString()
      .replace(/\[[^\]]*\]|\u3000+/g, " ")
      .trim()
      .replace(
        /…$|\.{3}|[\x00-\x1F\x7F-\x9F]|[\u2000-\u200a\u202f\u2800\u200B\u200C\u200D\uFEFF]+/g,
        ""
      ) || "暂无";
  const description =
    $.text()
      .replace(/\n{2,}/g, "\n")
      .replace(/\[[^\]]*\]/g, " ")
      .replace(/^\n+|\n+$/g, "")
      .trim() || "暂无";
  if (title === "暂无" && description === "暂无") return undefined;
  const isTitleAndDescriptionSame = description
    ?.replace(/[\n \u3000+]+/g, "")
    .includes(title?.replace(/[ \u3000+]+/g, ""));
  return {
    ...items[0],
    image: dynamic.data.rss.channel.image.url,
    title: isTitleAndDescriptionSame ? "暂无" : title,
    description: description.includes("\n") ? "\n" + description : description,
  };
}

async function User(name: string) {
  const userJson = await UrlToJson(Config.Bili.user + name);
  if (!userJson) return undefined;
  const userSchema = z.object({
    data: z.object({
      result: z
        .array(
          z.object({
            uname: z.string(),
            mid: z.number(),
            room_id: z.number(),
          })
        )
        .min(1),
    }),
  });
  const user = userSchema.safeParse(userJson);
  if (!user.success) return undefined;
  return user.data.data.result[0];
}

async function Card(memberID: number) {
  const cardJson = await UrlToJson(Config.Bili.card + memberID);
  if (!cardJson) return undefined;
  const userSchema = z.object({
    data: z.object({
      card: z.object({ fans: z.number() }),
    }),
  });
  const user = userSchema.safeParse(cardJson);
  if (!user.success) return undefined;
  return user.data.data.card;
}

async function Live(memberID: Array<number>) {
  const liveJson = await fetch(Config.Bili.live.url, {
    method: "post",
    signal: AbortSignal.timeout(5000),
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ uids: memberID }),
  })
    .then((res) => res.json())
    .catch((_) => undefined);
  if (!liveJson) return undefined;
  const liveSchema = z.object({
    data: z.record(
      //主播uid
      z.string(),
      z.object({
        //直播间标题
        title: z.string(),
        //直播间房间号
        room_id: z.number(),
        //new Date(live_time*1000)
        live_time: z.number(),
        //0未开播,1开播,2轮播
        live_status: z.number(),
        //主播昵称
        uname: z.string(),
        //直播间封面url
        cover_from_user: z.string(),
      })
    ),
  });
  const live = liveSchema.safeParse(liveJson);
  if (!live.success) return undefined;
  return live.data.data;
}

async function LiveReply(live: {
  coverFromUser: string;
  title: string;
  name: string;
  liveTime: number;
  roomId: number;
}) {
  const liveTime = () => {
    if (live.liveTime === 0) return "未开播";
    return dayjs(live.liveTime * 1000).format("YYYY年MM月DD日 HH点mm分ss秒");
  };
  return {
    cover: await UrlToBuffer(live.coverFromUser),
    text: `🔥【直播进行时】🔥\n🎤 人气主播: "${live.name}"\n📌 独家主题: ${
      live.title
    }\n⏰ 开播日期: ${liveTime()}\n👉 立即观看不迷路: https://live.bilibili.com/${
      live.roomId
    }`,
  };
}

async function LiveEndReply(live: {
  coverFromUser: string;
  name: string;
  title: string;
  startTime: number;
  fans: number;
}) {
  const liveTime = () => {
    return dayjs().diff(dayjs(live.startTime * 1000), "minute");
  };
  const fans = () => {
    if (live.fans <= 0) return "";
    return `\n🎉 本场直播将鸣谢 ${live.fans} 位新粉丝`;
  };
  return {
    cover: await UrlToBuffer(live.coverFromUser),
    text: `💤【本场直播即将进入尾声】💤\n⚡ 流量宠儿: "${
      live.name
    }"\n📌 独家主题: ${
      live.title
    }${fans()}\n💕 感谢家人们 ${liveTime()} 分钟的暖心陪伴`,
  };
}

function DynamicReply(dynamicData: {
  link: string;
  title: string;
  description: string;
  author: string;
  pubDate: string;
}) {
  const title = () => {
    if (dynamicData.title === "暂无") return "";
    return `📌 独家主题: ${dynamicData.title}\n`;
  };
  const description = () => {
    if (dynamicData.description === "暂无") return "";
    return `💬 内容亮点: ${dynamicData.description}\n`;
  };
  return {
    text: `🔥【未读动态+1】🔥\n🎤 人气UP主: "${
      dynamicData.author
    }"\n${title()}${description()}⏰ 发布日期: ${dayjs(
      dynamicData.pubDate
    ).format("YYYY年MM月DD日 HH点mm分ss秒")}\n👉 立即围观: ${dynamicData.link}`,
  };
}

export { Card, Dynamic, DynamicReply, Live, LiveEndReply, LiveReply, User };
