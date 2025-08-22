import Config from "@miz/ai/config/config.toml";
import { Client, SendGroupMessage } from "@miz/ai/src/core/bot";
import * as EarthquakeModel from "@miz/ai/src/models/earthquake";
import * as GroupModel from "@miz/ai/src/models/group";
import * as PluginModel from "@miz/ai/src/models/plugin";
import { Earthquake, EarthquakeReply } from "@miz/ai/src/service/earthquake";
import { sleep } from "bun";
import dayjs from "dayjs";
import { Structs } from "node-napcat-ts";
import schedule from "node-schedule";

const lock = {
  isPushing: false,
};

async function PushEarthquake() {
  if (lock.isPushing) return;
  const earthquakeList = await Earthquake(Config.Earthquake.level);
  if (!earthquakeList || !earthquakeList.length) return;
  const recentEarthquakeList = earthquakeList.filter(
    (v) => dayjs().diff(dayjs(v.pubDate), "day") < Config.Earthquake.limit
  );
  if (!recentEarthquakeList.length) return;
  const earthquakes: Array<{
    title: string;
    description: string;
    pubDate: string;
    link: string;
  }> = [];
  for (const earthquake of recentEarthquakeList) {
    const findEarthquake = await EarthquakeModel.Find(earthquake.description);
    if (!findEarthquake) {
      earthquakes.push(earthquake);
    }
  }
  if (!earthquakes.length) return;
  lock.isPushing = true;
  const groups = await Client().get_group_list();
  for (const group of groups) {
    const findGroup = await GroupModel.FindOrAdd(group.group_id);
    if (!findGroup || !findGroup.active) continue;
    const lock = await PluginModel.FindOrAdd(group.group_id, "地震推送", true);
    if (!lock || !lock.enable) continue;
    for (const earthquake of earthquakes) {
      const earthquakeReply = EarthquakeReply(earthquake);
      await SendGroupMessage(group.group_id, [
        Structs.text(earthquakeReply.text),
      ]);
      await sleep(Config.Bot.message_delay * 1000);
    }
  }
  for (const earthquake of earthquakes) {
    await EarthquakeModel.Add(
      earthquake.title,
      earthquake.description,
      earthquake.link,
      earthquake.pubDate
    );
  }
  lock.isPushing = false;
}

function Task() {
  schedule.scheduleJob(Config.Earthquake.spec, PushEarthquake);
}

export { Task };
