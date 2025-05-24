import config from "@miz/ai/config/config.toml";
import { getClient, sendGroupMsg } from "@miz/ai/src/core/bot";
import { wallpaper } from "@miz/ai/src/service/wallpaper";
import { Structs } from "node-napcat-ts";
import schedule from "node-schedule";

async function pushWallpaper() {
  const groupList = await getClient().get_group_list();
  const imageInfo = await wallpaper();
  if (!imageInfo || !imageInfo.image) return;
  for (const group of groupList) {
    await sendGroupMsg(group.group_id, [
      Structs.image(imageInfo.image),
      Structs.text(`🌅 数字艺术日报 🌄\n✨ 本日焦点: ${imageInfo.copyright}`),
    ]);
  }
}

function task() {
  schedule.scheduleJob(config.wallpaper.realtime, pushWallpaper);
}

export { task };
