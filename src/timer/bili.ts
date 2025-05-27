import config from "@miz/ai/config/config.toml";
import { getClient, sendGroupMsg } from "@miz/ai/src/core/bot";
import * as biliModel from "@miz/ai/src/models/bili";
import * as groupModel from "@miz/ai/src/models/group";
import * as pluginModel from "@miz/ai/src/models/plugin";
import {
  dynamicMsg,
  fetchDynamic,
  fetchLive,
  liveMsg,
} from "@miz/ai/src/service/bili";
import dayjs from "dayjs";
import { Structs } from "node-napcat-ts";
import schedule from "node-schedule";

async function pushLiveNotifications() {
  const groups = await getClient().get_group_list();
  const biliFindAll = await biliModel.findAll();
  if (!biliFindAll.length) return;
  const mids = biliFindAll.map((v) => v.mid);
  const lives = await fetchLive(mids);
  if (!lives) return;
  for (const group of groups) {
    const findGroup = await groupModel.findOrAdd(group.group_id);
    if (!findGroup.active) continue;
    const lock = await pluginModel.findOrAdd(group.group_id, "直播推送", true);
    if (!lock.enable) continue;
    const vtbs = biliFindAll.filter((v) => v.gid === group.group_id);
    if (!vtbs.length) continue;
    for (const vtb of vtbs) {
      const user = lives[vtb.mid];
      if (!user) continue;
      if (
        !dayjs()
          .subtract(config.bili.frequency, "minute")
          .isBefore(new Date(user.live_time * 1000)) ||
        user.live_status !== 1
      )
        continue;
      const msg = await liveMsg(user);
      await sendGroupMsg(group.group_id, [
        Structs.image(msg.cover),
        Structs.text(msg.text),
      ]);
    }
  }
}

//@ts-ignore
async function pushDynamicNotifications() {
  const groups = await getClient().get_group_list();
  const biliFindAll = await biliModel.findAll();
  if (!biliFindAll.length) return;
  for (const group of groups) {
    const findGroup = await groupModel.findOrAdd(group.group_id);
    if (!findGroup.active) continue;
    const lock = await pluginModel.findOrAdd(group.group_id, "动态推送", true);
    if (!lock.enable) continue;
    const vtbs = biliFindAll.filter((v) => v.gid === group.group_id);
    if (!vtbs.length) continue;
    for (const vtb of vtbs) {
      const dynamic = await fetchDynamic(vtb.mid);
      if (!dynamic) continue;
      if (
        !dayjs()
          .subtract(config.bili.frequency, "minute")
          .isBefore(new Date(dynamic.date * 1000))
      )
        continue;
      const msg = await dynamicMsg(dynamic);
      if (!msg.image) continue;
      await sendGroupMsg(group.group_id, [
        Structs.image(msg.image),
        Structs.text(msg.text),
      ]);
    }
  }
}

function task() {
  schedule.scheduleJob(config.bili.realtime, pushLiveNotifications);
  //schedule.scheduleJob(config.bili.realtime, pushDynamicNotifications);
}

export { task };
