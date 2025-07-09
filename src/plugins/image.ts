import Config from "@miz/ai/config/config.toml";
import { CommandText, SendGroupMessage } from "@miz/ai/src/core/bot";
import { Baidu } from "@miz/ai/src/service/image";
import { Structs, type GroupMessage } from "node-napcat-ts";

const info = {
  name: "看",
  comment: [`使用 "看 [要看的图]" 命令看图`],
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
      Structs.text(
        `命令错误，缺少要看的图片名称。\n请使用 "看 [要看的图]" 命令看图`
      ),
    ]);
    return;
  }
  const baiduImage = await Baidu(commandText);
  if (!baiduImage) {
    await SendGroupMessage(event.group_id, [
      Structs.reply(event.message_id),
      Structs.text("没找要你要看的图"),
    ]);
    return;
  }
  await SendGroupMessage(event.group_id, [
    Structs.reply(event.message_id),
    Structs.image(baiduImage),
  ]);
}

export { info };
