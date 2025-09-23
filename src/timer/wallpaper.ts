import Config from "miz/config/config.toml";
import { Client, SendGroupMessage } from "miz/src/core/bot";
import * as GroupModel from "miz/src/models/group";
import * as PluginModel from "miz/src/models/plugin";
import { Wallpaper } from "miz/src/service/wallpaper";
import { sleep } from "bun";
import { Structs } from "node-napcat-ts";
import schedule from "node-schedule";

async function PushWallpaper() {
  const groupList = await Client().get_group_list();
  const imageInfo = await Wallpaper();
  if (!groupList.length || !imageInfo || !imageInfo.image) return;
  for (const group of groupList) {
    const findGroup = await GroupModel.FindOrAdd(group.group_id);
    if (!findGroup || !findGroup.active) continue;
    const lock = await PluginModel.FindOrAdd(group.group_id, "每日壁纸", true);
    if (!lock || !lock.enable) continue;
    await SendGroupMessage(group.group_id, [
      Structs.image(imageInfo.image),
      Structs.text(`🌅 数字艺术日报 🌄\n✨ 本日焦点: ${imageInfo.copyright}`),
    ]);
    await sleep(Config.Bot.message_delay * 1000);
  }
}

function Task() {
  schedule.scheduleJob(Config.Wallpaper.spec, PushWallpaper);
}

export { Task };
