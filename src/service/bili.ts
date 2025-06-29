import config from "@miz/ai/config/config.toml";
import { urlToBuffer } from "@miz/ai/src/core/http";
import * as cheerio from "cheerio";
import dayjs from "dayjs";
import { XMLParser } from "fast-xml-parser";
import { z } from "zod";

async function fetchDynamic(mid: number) {
  const dynamic = await fetch(config.bili.dynamic + mid, {
    signal: AbortSignal.timeout(5000),
  })
    .then((res) => res.text())
    .catch((_) => undefined);
  if (!dynamic) return undefined;
  const parser = new XMLParser();
  let dynamicObj = parser.parse(dynamic);
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
  const dynamicData = dynamicSchema.safeParse(dynamicObj);
  if (!dynamicData.success) return undefined;
  const items = dynamicData.data.rss.channel.item.filter(
    (v) => !v.description.toString().includes("直播间地址：")
  );
  if (!items.length) return undefined;
  const currentItem = items[0];
  if (!currentItem) return undefined;
  const $ = cheerio.load(
    currentItem.description
      .toString()
      .replace(/<br>/g, "\n")
      .replace(/图文地址：|视频地址：/g, "")
  );
  $("a").remove();
  const titleReg =
    currentItem.title
      .toString()
      .replace(/\[[^\]]*\]|\u3000+/g, " ")
      .trim()
      .replace(
        /…$|\.{3}|[\x00-\x1F\x7F-\x9F]|[\u2000-\u200a\u202f\u2800\u200B\u200C\u200D\uFEFF]+/g,
        ""
      ) || "暂无";
  const descriptionReg =
    $.text()
      .replace(/\n{2,}/g, "\n")
      .replace(/\[[^\]]*\]/g, " ")
      .replace(/^\n+|\n+$/g, "")
      .trim() || "暂无";
  if (titleReg === "暂无" && descriptionReg === "暂无") return undefined;
  const isTitleDescSame = descriptionReg
    ?.replace(/[\n \u3000+]+/g, "")
    .includes(titleReg?.replace(/[ \u3000+]+/g, ""));
  const title = isTitleDescSame ? "暂无" : titleReg;
  const description = descriptionReg?.includes("\n")
    ? "\n" + descriptionReg
    : descriptionReg;
  return {
    ...currentItem,
    image: dynamicData.data.rss.channel.image.url,
    title: title,
    description: description,
  };
}

async function fetchUser(name: string) {
  const user = await fetch(config.bili.user + name, {
    signal: AbortSignal.timeout(5000),
    headers: {
      Cookie: config.bili.cookie,
    },
  })
    .then((res) => res.json())
    .catch((_) => undefined);
  if (!user) return undefined;
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
  const userData = userSchema.safeParse(user);
  return userData.success ? userData.data.data.result[0] : undefined;
}

async function fetchCard(mid: number) {
  const user = await fetch(config.bili.card + mid, {
    signal: AbortSignal.timeout(5000),
  })
    .then((res) => res.json())
    .catch((_) => undefined);
  if (!user) return undefined;
  const userSchema = z.object({
    data: z.object({
      card: z.object({ fans: z.number() }),
    }),
  });
  const userData = userSchema.safeParse(user);
  return userData.success ? userData.data.data.card : undefined;
}

async function fetchLive(mids: Array<number>) {
  const live = await fetch(config.bili.live, {
    method: "post",
    signal: AbortSignal.timeout(5000),
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ uids: mids }),
  })
    .then((res) => res.json())
    .catch((_) => undefined);
  if (!live) return undefined;
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
  const liveData = liveSchema.safeParse(live);
  return liveData.success ? liveData.data.data : undefined;
}

async function liveMsg(liveData: {
  cover_from_user: string;
  title: string;
  uname: string;
  live_time: number;
  room_id: number;
}) {
  const liveTime = () => {
    if (liveData.live_time === 0) return "未开播";
    return dayjs(liveData.live_time * 1000).format(
      "YYYY年MM月DD日 HH点mm分ss秒"
    );
  };
  return {
    cover: await urlToBuffer(liveData.cover_from_user),
    text: `🔥【直播进行时】🔥\n🎤 人气主播: "${liveData.uname}"\n📌 独家主题: ${
      liveData.title
    }\n⏰ 开播日期: ${liveTime()}\n👉 立即观看不迷路: https://live.bilibili.com/${
      liveData.room_id
    }`,
  };
}

async function liveEndMsg(liveData: {
  cover_from_user: string;
  uname: string;
  title: string;
  startTime: number;
  fans: number;
}) {
  const liveTime = () => {
    return dayjs().diff(dayjs(liveData.startTime * 1000), "minute");
  };
  const fans = () => {
    if (liveData.fans <= 0) return "";
    return `\n🎉 本场直播将鸣谢 ${liveData.fans} 位新粉丝`;
  };
  return {
    cover: await urlToBuffer(liveData.cover_from_user),
    text: `💤【本场直播即将进入尾声】💤\n⚡ 流量宠儿: "${
      liveData.uname
    }"\n📌 独家主题: ${
      liveData.title
    }${fans()}\n💕 感谢家人们 ${liveTime()} 分钟的暖心陪伴`,
  };
}

function dynamicMsg(dynamicData: {
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

export {
  dynamicMsg,
  fetchCard,
  fetchDynamic,
  fetchLive,
  fetchUser,
  liveEndMsg,
  liveMsg,
};
