import config from "@miz/ai/config/config.toml";
import { cmdText, message, sendGroupMsg } from "@miz/ai/src/core/bot";
import { fetchID } from "@miz/ai/src/service/music";
import { Structs } from "node-napcat-ts";

const info = {
  name: "听",
  comment: [`使用 "听 [音乐名] [歌手名]" 命令点歌`],
  plugin,
};

async function plugin(event: groupMessageEvent) {
  const msgEvent = await message(event.messageId);
  const msg = cmdText(msgEvent.raw_message, [config.bot.name, info.name]);
  if (!msg) {
    await sendGroupMsg(event.groupId, [
      Structs.reply(event.messageId),
      Structs.text(`命令错误。请使用 "听 [音乐名] [歌手名]" 命令点歌。`),
    ]);
    return;
  }
  const musicID = await fetchID(msg);
  if (!musicID) {
    await sendGroupMsg(event.groupId, [
      Structs.reply(event.messageId),
      Structs.text(`没有找到相关歌曲。`),
    ]);
    return;
  }
  await sendGroupMsg(event.groupId, [Structs.music("163", musicID)]);
}

export { info };
