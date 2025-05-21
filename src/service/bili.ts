import config from "@miz/ai/config/config.toml";
import dayjs from "dayjs";
import { z } from "zod";

async function fetchUser(name: string) {
  const user = await fetch(config.bili.user + name, {
    signal: AbortSignal.timeout(5000),
    headers: {
      cookie: config.bili.cookie,
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
    text: `\n主播: "${liveData.uname}"\n标题: ${liveData.title}\n开播时间: ${
      liveData.live_time === 0
        ? "未开播"
        : dayjs(liveData.live_time * 1000).format("YYYY-MM-DD HH:mm:ss")
    }\n直播间: https://live.bilibili.com/${liveData.room_id}`,
  };
}

export { fetchLive, fetchUser, liveMsg };
