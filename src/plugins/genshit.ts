import { SendGroupMessage } from "@miz/ai/src/core/bot";
import { Genshit } from "@miz/ai/src/service/genshit";
import { Structs, type GroupMessage } from "node-napcat-ts";

const info = {
  name: "看原批",
  comment: [`使用 "看原批" 命令看一则原批笑话`],
  Plugin,
};

async function Plugin(event: GroupMessage) {
  const genshit = await Genshit();
  if (!genshit) {
    await SendGroupMessage(event.group_id, [
      Structs.reply(event.message_id),
      Structs.text(`暂时没有原批笑话,请稍候重试。`),
    ]);
    return;
  }
  await SendGroupMessage(event.group_id, [
    Structs.reply(event.message_id),
    Structs.image(genshit),
  ]);
}

export { info };
