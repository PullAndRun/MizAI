import { sleep } from "bun";
import Config from "miz/config/config.toml";
import { Client, Message, SendGroupMessage } from "miz/src/core/bot";
import { Structs, type GroupMessage } from "node-napcat-ts";

const info = {
  name: "广播",
  comment: [`使用 "广播 [广播内容]" 命令向所有群发送广播`],
  Plugin,
};

async function Plugin(event: GroupMessage) {
  if (event.sender.user_id !== Config.Bot.admin) {
    await SendGroupMessage(event.group_id, [
      Structs.reply(event.message_id),
      Structs.text(`权限不足,无法执行命令\n您需要: 系统管理员权限`),
    ]);
    return;
  }
  const message = Message(event.message, [Config.Bot.name, info.name]);
  if (!message) {
    await SendGroupMessage(event.group_id, [
      Structs.reply(event.message_id),
      Structs.text(`缺少广播内容\n请输入广播内容`),
    ]);
    return;
  }
  const groups = await Client().get_group_list();
  for (const group of groups) {
    await SendGroupMessage(group.group_id, [Structs.text(message)]);
    sleep(Config.Bot.message_delay * 1000);
  }
}

export { info };
