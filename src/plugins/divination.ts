import Config from "@miz/ai/config/config.toml";
import { CommandText, SendGroupMessage } from "@miz/ai/src/core/bot";
import { Divination } from "@miz/ai/src/service/divination";
import { Structs, type GroupMessage } from "node-napcat-ts";

const info = {
  name: "占卜",
  comment: [`使用 "占卜 [占卜内容]" 命令进行占卜`],
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
        `命令错误,缺少占卜内容\n请使用 "占卜 [占卜内容]" 命令进行占卜\n例如 ${Config.Bot.name}占卜 晚餐吃鱼`
      ),
    ]);
    return;
  }
  await SendGroupMessage(event.group_id, [
    Structs.reply(event.message_id),
    Structs.text(`您占卜的 "${commandText}" 结果是 "${Divination()}"`),
  ]);
}

export { info };
