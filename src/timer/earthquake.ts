import config from "@miz/ai/config/config.toml";
import * as groupModel from "@miz/ai/src/models/group";
import * as pluginModel from "@miz/ai/src/models/plugin";
import { sleep } from "bun";
import dayjs from "dayjs";
import { Structs } from "node-napcat-ts";
import schedule from "node-schedule";
import { getClient, sendGroupMsg } from "../core/bot";
import { earthquakeMsg, fetchEarthquake } from "../service/earthquake";

async function pushEarthquake() {
  const groups = await getClient().get_group_list();
  const earthquakeList = await fetchEarthquake(config.earthquake.level);
  if (!earthquakeList) return;
  const earthquake = earthquakeList[0];
  if (!earthquake) return;
  for (const group of groups) {
    const findGroup = await groupModel.findOrAdd(group.group_id);
    if (!findGroup.active) continue;
    const lock = await pluginModel.findOrAdd(group.group_id, "地震推送", false);
    if (!lock.enable) continue;
    if (
      dayjs().diff(dayjs(earthquake.pubDate), "minute") >=
      config.earthquake.frequency
    )
      continue;
    const msg = earthquakeMsg(earthquake);
    await sleep(config.bot.pushWait * 1000);
    await sendGroupMsg(group.group_id, [Structs.text(msg.text)]);
  }
}

function task() {
  schedule.scheduleJob(config.earthquake.spec, pushEarthquake);
}

export { task };
