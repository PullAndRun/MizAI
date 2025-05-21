import config from "@miz/ai/config/config.toml";
import { cmdText, sendGroupMsg } from "@miz/ai/src/core/bot";
import { aiDivination } from "@miz/ai/src/service/divination";
import { Structs, type GroupMessage } from "node-napcat-ts";

const info = {
  name: "算命",
  comment: [`使用 "算命 [算命内容]" 命令进行算命`],
  plugin,
};

async function plugin(event: GroupMessage) {
  const msg = cmdText(event.raw_message, [config.bot.name, info.name]);
  if (!msg) {
    await sendGroupMsg(event.group_id, [
      Structs.reply(event.message_id),
      Structs.text(
        `命令错误,缺少算命内容\n请使用 "算命 [算命内容]" 命令进行算命\n例如 ${config.bot.name}算命 晚餐吃鱼`
      ),
    ]);
    return;
  }
  const chatText = await aiDivination(msg);
  if (!chatText) {
    await sendGroupMsg(event.group_id, [
      Structs.reply(event.message_id),
      Structs.text("机器人cpu过热\n请稍候重试。"),
    ]);
    return;
  }
  await sendGroupMsg(event.group_id, [
    Structs.reply(event.message_id),
    Structs.text(chatText.replace(/^(\n+)/g, "").replace(/\n+/g, "\n")),
  ]);
}

export { info };
