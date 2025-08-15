import { SendGroupMessage } from "@miz/ai/src/core/bot";
import { Structs, type GroupMessage } from "node-napcat-ts";

const info = {
  name: "天气",
  comment: [`使用 "天气" 命令查看天气预报`],
  Plugin,
};

async function Plugin(event: GroupMessage) {
  // const image = await Weather();
  // if (!image) return;
  // await SendGroupMessage(event.group_id, [Structs.image(image)]);
  await SendGroupMessage(event.group_id, [
    Structs.reply(event.sender.user_id),
    Structs.text("天气api不稳定，调试中。"),
  ]);
}

export { info };
