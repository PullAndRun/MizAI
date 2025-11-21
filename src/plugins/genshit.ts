import { SendGroupMessage, SendSegmentMessage } from "miz/src/core/bot";
import { Genshit } from "miz/src/service/image";
import {
  Structs,
  type GroupMessage,
  type SendMessageSegment,
} from "node-napcat-ts";

const info = {
  name: "看原批",
  comment: [`使用 "看原批" 命令看原批笑话`],
  Plugin,
};

async function Plugin(event: GroupMessage) {
  const contents: SendMessageSegment[][] = [];
  for (let i = 0; i < 10; i++) {
    const genshit = await Genshit();
    if (!genshit) continue;
    contents.push([Structs.image(genshit)]);
  }
  if (!contents.length) {
    await SendGroupMessage(event.group_id, [
      Structs.reply(event.message_id),
      Structs.text(`暂时没有原批笑话,请稍候重试。`),
    ]);
    return;
  }
  await SendSegmentMessage(event.group_id, contents);
  await SendGroupMessage(event.group_id, [
    Structs.reply(event.message_id),
    Structs.text("为您推荐十则原批笑话。"),
  ]);
}

export { info };
