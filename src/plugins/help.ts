import { sendGroupMsg } from "@miz/ai/src/core/bot";
import { help } from "@miz/ai/src/service/help";
import { Structs } from "node-napcat-ts";

const info = {
  name: "帮助",
  comment: [`使用 "帮助" 命令查看机器人命令文档`],
  plugin,
};

async function plugin(event: groupMessageEvent) {
  await sendGroupMsg(event.groupId, [
    Structs.reply(event.messageId),
    Structs.text(help()),
  ]);
}

export { info };
