import Config from "miz/config/config.toml";
import {
  Message,
  SendGroupMessage,
  SendSegmentMessage,
} from "miz/src/core/bot";
import { HotComment, ID } from "miz/src/service/music";
import {
  Structs,
  type GroupMessage,
  type SendMessageSegment,
} from "node-napcat-ts";

const info = {
  name: "听",
  comment: [`使用 "听 [音乐名] [歌手名]" 命令点歌`],
  Plugin,
};

async function Plugin(event: GroupMessage) {
  const message = Message(event.message, [Config.Bot.name, info.name]);
  if (!message) {
    await SendGroupMessage(event.group_id, [
      Structs.reply(event.message_id),
      Structs.text(`命令错误。请使用 "听 [音乐名] [歌手名]" 命令点歌。`),
    ]);
    return;
  }
  const id = await ID(message);
  if (!id) {
    await SendGroupMessage(event.group_id, [
      Structs.reply(event.message_id),
      Structs.text(`没有找到您想听的歌曲。`),
    ]);
    return;
  }
  const contents: SendMessageSegment[][] = [];
  contents.push([Structs.music("163", id)]);
  const hotComment = await HotComment(id);
  if (hotComment) contents.push([Structs.text(hotComment)]);
  await SendSegmentMessage(event.group_id, contents);
  await SendGroupMessage(event.group_id, [
    Structs.reply(event.message_id),
    Structs.text(`已为您推送歌曲 "${message}"`),
  ]);
}

export { info };
