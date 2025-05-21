import config from "@miz/ai/config/config.toml";
import { cmdText, sendGroupMsg } from "@miz/ai/src/core/bot";
import { divination } from "@miz/ai/src/service/divination";
import { Structs, type GroupMessage } from "node-napcat-ts";

const info = {
  name: "占卜",
  comment: [`使用 "占卜 [占卜内容]" 命令进行占卜`],
  plugin,
};

async function plugin(event: GroupMessage) {
  const msg = cmdText(event.raw_message, [config.bot.name, info.name]);
  if (!msg) {
    await sendGroupMsg(event.group_id, [
      Structs.reply(event.message_id),
      Structs.text(
        `命令错误,缺少占卜内容\n请使用 "占卜 [占卜内容]" 命令进行占卜\n例如 ${config.bot.name}占卜 晚餐吃鱼`
      ),
    ]);
    return;
  }
  await sendGroupMsg(event.group_id, [
    Structs.reply(event.message_id),
    Structs.text(`您占卜的 "${msg}" 结果是 "${divination()}"`),
  ]);
}

export { info };
