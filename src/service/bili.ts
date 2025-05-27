import config from "@miz/ai/config/config.toml";
import { sleep } from "bun";
import dayjs from "dayjs";
import puppeteer, { KnownDevices } from "puppeteer";
import { z } from "zod";

async function dynamicImage(url: string) {
  const browser = await puppeteer.launch({
    browser: "chrome",
    headless: true,
    args: ["--disable-dev-shm-usage", "--no-sandbox", "--disable-gpu"],
  });
  const page = await browser.newPage();
  await page.emulate(KnownDevices["iPad Pro"]);
  await page.goto(url);
  const waitScreenshot = await page.waitForSelector(".bili-dyn-item");
  await page.click(".v-popover-content");
  await page.click("#app");
  await sleep(500);
  if (!waitScreenshot) {
    await page.close();
    return;
  }
  const image = await waitScreenshot.screenshot();
  await page.close();
  return Buffer.from(image);
}

async function fetchDynamic(mid: number) {
  const dynamic = await fetch(config.bili.dynamic + mid, {
    signal: AbortSignal.timeout(5000),
    headers: {
      cookie: config.bili.cookie,
    },
  })
    .then((res) => res.json())
    .catch((_) => undefined);
  if (!dynamic) return undefined;
  const dynamicSchema = z.object({
    data: z.object({
      items: z
        .array(
          z.object({
            id_str: z.string(),
            modules: z.object({
              module_author: z.object({
                pub_ts: z.number(),
                pub_time: z.string().nullish(),
                name: z.string(),
              }),
            }),
          })
        )
        .min(1),
    }),
  });
  const userData = dynamicSchema.safeParse(dynamic);
  if (!userData.success) return undefined;
  const data = userData.data.data.items.filter(
    (v) => v.modules.module_author.pub_time
  )[0];
  if (!data) return undefined;
  return {
    url: config.bili.dynamicInfo + data.id_str,
    date: data.modules.module_author.pub_ts,
    name: data.modules.module_author.name,
    id: data.id_str,
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
  return {
    cover: liveData.cover_from_user,
    text: `🔥【直播进行时】🔥\n🎤 人气主播: "${liveData.uname}"\n🌟 独家主题: ${
      liveData.title
    }\n⏰ 开播时间: ${
      liveData.live_time === 0
        ? "未开播"
        : dayjs(liveData.live_time * 1000).format("YYYY年MM月DD日 HH点mm分ss秒")
    }\n👉 立即观看不迷路: https://live.bilibili.com/${liveData.room_id}`,
  };
}

async function dynamicMsg(dynamicData: {
  url: string;
  name: string;
  date: number;
  id: string;
}) {
  const image = await dynamicImage(dynamicData.url);
  return {
    image: image,
    text: `🔥【未读动态+1】🔥\n🎤 人气UP主: "${
      dynamicData.name
    }"\n⏰ 推送时间: ${dayjs(dynamicData.date * 1000).format(
      "YYYY年MM月DD日 HH点mm分ss秒"
    )}\n👉 新鲜速递: ${config.bili.dynamicInfo}${dynamicData.id}`,
  };
}

export {
  dynamicImage,
  dynamicMsg,
  fetchDynamic,
  fetchLive,
  fetchUser,
  liveMsg,
};
