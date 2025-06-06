import config from "@miz/ai/config/config.toml";
import { cmdText, sendGroupMsg } from "@miz/ai/src/core/bot";
import { fetchHotComment, fetchID } from "@miz/ai/src/service/music";
import { Structs, type GroupMessage } from "node-napcat-ts";

const info = {
  name: "听",
  comment: [`使用 "听 [音乐名] [歌手名]" 命令点歌`],
  plugin,
};

async function plugin(event: GroupMessage) {
  const msg = cmdText(event.raw_message, [config.bot.name, info.name]);
  if (!msg) {
    await sendGroupMsg(event.group_id, [
      Structs.reply(event.message_id),
      Structs.text(`命令错误。请使用 "听 [音乐名] [歌手名]" 命令点歌。`),
    ]);
    return;
  }
  const musicID = await fetchID(msg);
  if (!musicID) {
    await sendGroupMsg(event.group_id, [
      Structs.reply(event.message_id),
      Structs.text(`没有找到您想听的歌曲。`),
    ]);
    return;
  }
  const message = await sendGroupMsg(event.group_id, [
    Structs.music("163", musicID),
  ]);
  if (!message) return;
  const hotComment = await fetchHotComment(musicID);
  if (!hotComment) return;
  await sendGroupMsg(event.group_id, [
    Structs.reply(message.message_id),
    Structs.text(hotComment),
  ]);
}

export { info };
