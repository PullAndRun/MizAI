import { sendGroupMsg } from "@miz/ai/src/core/bot";
import { help } from "@miz/ai/src/service/help";
import { Structs, type GroupMessage } from "node-napcat-ts";

const info = {
  name: "帮助",
  comment: [`使用 "帮助" 命令查看机器人命令文档`],
  plugin,
};

async function plugin(event: GroupMessage) {
  await sendGroupMsg(event.group_id, [
    Structs.reply(event.message_id),
    Structs.text(help()),
  ]);
}

export { info };
