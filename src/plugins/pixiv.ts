import { SendGroupMessage } from "@miz/ai/src/core/bot";
import { Pixiv } from "@miz/ai/src/service/image";
import { Structs, type GroupMessage } from "node-napcat-ts";

const info = {
  name: "看图",
  comment: [`使用 "看图" 命令看一张随机图`],
  Plugin,
};

async function Plugin(event: GroupMessage) {
  const pixiv = await Pixiv();
  if (!pixiv) {
    await SendGroupMessage(event.group_id, [
      Structs.reply(event.message_id),
      Structs.text(`暂时没有随机图,请稍候重试。`),
    ]);
    return;
  }
  await SendGroupMessage(event.group_id, [
    Structs.reply(event.message_id),
    Structs.image(pixiv),
  ]);
}

export { info };
