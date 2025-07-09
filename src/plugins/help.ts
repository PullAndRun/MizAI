import { SendGroupMessage } from "@miz/ai/src/core/bot";
import { ShowPlugin } from "@miz/ai/src/core/plugin";
import { Structs, type GroupMessage } from "node-napcat-ts";

const info = {
  name: "帮助",
  comment: [`使用 "帮助" 命令查看机器人使用说明`],
  Plugin,
};

async function Plugin(event: GroupMessage) {
  await SendGroupMessage(event.group_id, [
    Structs.reply(event.message_id),
    Structs.text(ShowPlugin()),
  ]);
}

export { info };
