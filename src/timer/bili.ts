import config from "@miz/ai/config/config.toml";
import { getClient, sendGroupMsg } from "@miz/ai/src/core/bot";
import * as biliModel from "@miz/ai/src/models/bili";
import * as pluginModel from "@miz/ai/src/models/plugin";
import { fetchLive, liveMsg } from "@miz/ai/src/service/bili";
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
  for (const [_, group] of groups.entries()) {
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
          .isBefore(new Date(user.live_time)) ||
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

function task() {
  schedule.scheduleJob(`0 */1 * * * *`, pushLiveNotifications);
}

export { task };
