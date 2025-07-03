import config from "@miz/ai/config/config.toml";
import { cmdText, getClient, sendGroupMsg } from "@miz/ai/src/core/bot";
import { sleep } from "bun";
import { Structs, type GroupMessage } from "node-napcat-ts";

const info = {
  name: "广播",
  comment: [`使用 "广播 [广播内容]" 命令向所有群发送广播`],
  plugin,
};

async function plugin(event: GroupMessage) {
  if (event.sender.user_id !== config.bot.admin) {
    await sendGroupMsg(event.group_id, [
      Structs.reply(event.message_id),
      Structs.text(`权限不足,无法执行命令\n您需要: 系统管理员权限`),
    ]);
    return;
  }
  const msg = cmdText(event.raw_message, [config.bot.name, info.name]);
  if (!msg) {
    await sendGroupMsg(event.group_id, [
      Structs.reply(event.message_id),
      Structs.text(`缺少广播内容\n请输入广播你内容`),
    ]);
    return;
  }
  const groups = await getClient().get_group_list();
  for (const group of groups) {
    await sendGroupMsg(group.group_id, [Structs.text(msg)]);
    sleep(config.bot.sleep * 1000);
  }
}

export { info };
