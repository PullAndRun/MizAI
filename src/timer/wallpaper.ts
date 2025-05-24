import config from "@miz/ai/config/config.toml";
import { getClient, sendGroupMsg } from "@miz/ai/src/core/bot";
import * as groupModel from "@miz/ai/src/models/group";
import { wallpaper } from "@miz/ai/src/service/wallpaper";
import { Structs } from "node-napcat-ts";
import schedule from "node-schedule";

async function pushWallpaper() {
  const groupList = await getClient().get_group_list();
  const imageInfo = await wallpaper();
  if (!imageInfo || !imageInfo.image) return;
  for (const group of groupList) {
    const findGroup = await groupModel.findOrAdd(group.group_id);
    if (!findGroup.active) continue;
    await sendGroupMsg(group.group_id, [
      Structs.image(imageInfo.image),
      Structs.text(`🌅 数字艺术日报 🌄\n✨ 本日焦点: ${imageInfo.copyright}`),
    ]);
  }
}

function task() {
  schedule.scheduleJob(config.wallpaper.daily, pushWallpaper);
}

export { task };
