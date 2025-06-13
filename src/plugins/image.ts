import config from "@miz/ai/config/config.toml";
import { cmdText, sendGroupMsg } from "@miz/ai/src/core/bot";
import { baiduSearch } from "@miz/ai/src/service/image";
import { Structs, type GroupMessage } from "node-napcat-ts";

const info = {
  name: "看",
  comment: [`使用 "看 [要看的图]" 命令看图`],
  plugin,
};
async function plugin(event: GroupMessage) {
  const msg = cmdText(event.raw_message, [config.bot.name, info.name]);
  if (!msg) {
    await sendGroupMsg(event.group_id, [
      Structs.reply(event.message_id),
      Structs.text(`命令错误，请使用 "看 [要看的图]" 命令看图`),
    ]);
    return;
  }
  const image = await baiduSearch(msg);
  if (!image) {
    await sendGroupMsg(event.group_id, [
      Structs.reply(event.message_id),
      Structs.text("没找要你要看的图"),
    ]);
    return;
  }
  await sendGroupMsg(event.group_id, [
    Structs.reply(event.message_id),
    Structs.image(image),
  ]);
}

export { info };
