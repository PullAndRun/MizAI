import config from "@miz/ai/config/config.toml";
import { getClient, sendGroupMsg } from "@miz/ai/src/core/bot";
import * as earthquakeModel from "@miz/ai/src/models/earthquake";
import * as groupModel from "@miz/ai/src/models/group";
import * as pluginModel from "@miz/ai/src/models/plugin";
import { earthquakeMsg, fetchEarthquake } from "@miz/ai/src/service/earthquake";
import { sleep } from "bun";
import { Structs } from "node-napcat-ts";
import schedule from "node-schedule";

async function pushEarthquake() {
  const earthquakeList = await fetchEarthquake(config.earthquake.level);
  if (!earthquakeList || !earthquakeList.length) return;
  const earthquakes: Array<{
    title: string;
    description: string;
    pubDate: string;
    link: string;
  }> = [];
  for (const earthquake of earthquakeList.filter((_, i) => i < 5)) {
    const findEarthquake = await earthquakeModel.find(
      earthquake.title,
      earthquake.description,
      earthquake.link,
      earthquake.pubDate
    );
    if (!findEarthquake) {
      earthquakes.push(earthquake);
    }
  }
  if (!earthquakes.length) return;
  const groups = await getClient().get_group_list();
  for (const group of groups) {
    const findGroup = await groupModel.findOrAdd(group.group_id);
    if (!findGroup.active) continue;
    const lock = await pluginModel.findOrAdd(group.group_id, "地震推送", true);
    if (!lock.enable) continue;
    for (const earthquake of earthquakes) {
      const msg = earthquakeMsg(earthquake);
      await sleep(config.bot.sleep * 1000);
      await sendGroupMsg(group.group_id, [Structs.text(msg.text)]);
    }
  }
  for (const earthquake of earthquakes) {
    await earthquakeModel.add(
      earthquake.title,
      earthquake.description,
      earthquake.link,
      earthquake.pubDate
    );
  }
}

function task() {
  schedule.scheduleJob(config.earthquake.spec, pushEarthquake);
}

export { task };
