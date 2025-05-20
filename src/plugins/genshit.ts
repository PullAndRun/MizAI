import { sendGroupMsg } from "@miz/ai/src/core/bot";
import { joke } from "@miz/ai/src/service/genshit";
import { Structs, type GroupMessage } from "node-napcat-ts";

const info = {
  name: "看原批",
  comment: [`使用 "看原批" 命令看一则原批笑话`],
  plugin,
};

async function plugin(event: GroupMessage) {
  const pickJoke = await joke();
  if (!pickJoke) {
    await sendGroupMsg(event.group_id, [
      Structs.reply(event.message_id),
      Structs.text(`暂时没有原批笑话,请稍候重试。`),
    ]);
    return;
  }
  await sendGroupMsg(event.group_id, [
    Structs.reply(event.message_id),
    Structs.image(pickJoke),
  ]);
}

export { info };
