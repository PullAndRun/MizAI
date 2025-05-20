import { sendGroupMsg } from "@miz/ai/src/core/bot";
import { joke } from "@miz/ai/src/service/genshit";
import { Structs } from "node-napcat-ts";

const info = {
  name: "看原批",
  comment: [`使用 "看原批" 命令看一则原批笑话`],
  plugin,
};

async function plugin(event: groupMessageEvent) {
  const pickJoke = await joke();
  if (!pickJoke) {
    await sendGroupMsg(event.groupId, [
      Structs.reply(event.messageId),
      Structs.text(`暂时没有原批笑话,请稍候重试。`),
    ]);
    return;
  }
  await sendGroupMsg(event.groupId, [
    Structs.reply(event.messageId),
    Structs.image(pickJoke),
  ]);
}

export { info };
