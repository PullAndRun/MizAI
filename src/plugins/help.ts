import { SendGroupMessage, SendSegmentMessage } from "miz/src/core/bot";
import { ShowPlugin } from "miz/src/core/plugin";
import { Structs, type GroupMessage } from "node-napcat-ts";

const info = {
  name: "帮助",
  comment: [`使用 "帮助" 命令查看机器人使用说明书`],
  Plugin,
};

async function Plugin(event: GroupMessage) {
  await SendSegmentMessage(event.group_id, [[Structs.text(ShowPlugin())]]);
  await SendGroupMessage(event.group_id, [
    Structs.reply(event.message_id),
    Structs.text("已为您推送机器人使用说明书。"),
  ]);
}

export { info };
