import Config from "miz/config/config.toml";
import { CommandText, SendGroupMessage } from "miz/src/core/bot";
import { HotComment, ID } from "miz/src/service/music";
import { Structs, type GroupMessage } from "node-napcat-ts";

const info = {
  name: "听",
  comment: [`使用 "听 [音乐名] [歌手名]" 命令点歌`],
  Plugin,
};

async function Plugin(event: GroupMessage) {
  const commandText = CommandText(event.raw_message, [
    Config.Bot.name,
    info.name,
  ]);
  if (!commandText) {
    await SendGroupMessage(event.group_id, [
      Structs.reply(event.message_id),
      Structs.text(`命令错误。请使用 "听 [音乐名] [歌手名]" 命令点歌。`),
    ]);
    return;
  }
  const id = await ID(commandText);
  if (!id) {
    await SendGroupMessage(event.group_id, [
      Structs.reply(event.message_id),
      Structs.text(`没有找到您想听的歌曲。`),
    ]);
    return;
  }
  const message = await SendGroupMessage(event.group_id, [
    Structs.music("163", id),
  ]);
  if (!message) return;
  const hotComment = await HotComment(id);
  if (!hotComment) return;
  await SendGroupMessage(event.group_id, [
    Structs.reply(message.message_id),
    Structs.text(hotComment),
  ]);
}

export { info };
