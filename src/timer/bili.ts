import config from "@miz/ai/config/config.toml";
import { getClient, sendGroupMsg } from "@miz/ai/src/core/bot";
import { urlToBuffer } from "@miz/ai/src/core/http";
import * as biliModel from "@miz/ai/src/models/bili";
import * as groupModel from "@miz/ai/src/models/group";
import * as pluginModel from "@miz/ai/src/models/plugin";
import {
  dynamicMsg,
  fetchCard,
  fetchDynamic,
  fetchLive,
  liveEndMsg,
  liveMsg,
} from "@miz/ai/src/service/bili";
import { sleep } from "bun";
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
      if (user.live_status !== 1 && vtb.isLive) {
        const card = await fetchCard(vtb.mid);
        const fans = () => {
          if (!card) return 0;
          if (!vtb.fans) return 0;
          return card.fans - vtb.fans;
        };
        const msg = await liveEndMsg({
          cover_from_user: user.cover_from_user,
          uname: user.uname,
          title: user.title,
          startTime: vtb.liveTime,
          fans: fans(),
        });
        await sendGroupMsg(group.group_id, [
          msg.cover && Structs.image(msg.cover),
          Structs.text(msg.text),
        ]);
        await biliModel.updateLiveStatus(vtb.gid, vtb.mid, vtb.rid, false);
        await biliModel.updateLiveTime(vtb.gid, vtb.mid, vtb.rid, 0);
        continue;
      }
      if (
        user.live_status !== 1 ||
        user.live_time === 0 ||
        dayjs().diff(dayjs(user.live_time * 1000), "minute") >=
          config.bili.liveFrequency
      )
        continue;
      const msg = await liveMsg(user);
      await sendGroupMsg(group.group_id, [
        msg.cover && Structs.image(msg.cover),
        Structs.text(msg.text),
      ]);
      const card = await fetchCard(vtb.mid);
      if (card) {
        await biliModel.updateFans(vtb.gid, vtb.mid, vtb.rid, card.fans);
      }
      await biliModel.updateLiveStatus(vtb.gid, vtb.mid, vtb.rid, true);
      await biliModel.updateLiveTime(vtb.gid, vtb.mid, vtb.rid, user.live_time);
    }
  }
}

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
        dayjs().diff(dayjs(dynamic.pubDate), "minute") >=
        config.bili.dynamicFrequency
      )
        continue;
      const msg = dynamicMsg(dynamic);
      const msgImage = await urlToBuffer(dynamic.image);
      await sleep(config.bili.wait * 1000);
      await sendGroupMsg(group.group_id, [
        msgImage && Structs.image(msgImage),
        Structs.text(msg.text),
      ]);
    }
  }
}

function task() {
  schedule.scheduleJob(config.bili.liveTime, pushLiveNotifications);
  schedule.scheduleJob(config.bili.dynamicTime, pushDynamicNotifications);
}

export { task };
