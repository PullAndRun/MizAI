import { sendGroupMsg } from "@miz/ai/src/core/bot";
import { wallpaper } from "@miz/ai/src/service/wallpaper";
import { Structs, type GroupMessage } from "node-napcat-ts";

const info = {
  name: "壁纸",
  comment: [`使用 "壁纸" 命令欣赏每日壁纸`],
  plugin,
};

async function plugin(event: GroupMessage) {
  const imageInfo = await wallpaper();
  if (!imageInfo || !imageInfo.image) return;
  await sendGroupMsg(event.group_id, [
    Structs.image(imageInfo.image),
    Structs.text(`🌅 每日壁纸 🌄\n✨ 来自: ${imageInfo.copyright}`),
  ]);
}

export { info };
