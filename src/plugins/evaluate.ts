import { getGroupMsg, sendGroupMsg } from "@miz/ai/src/core/bot";
import { urlToBuffer } from "@miz/ai/src/core/http";
import * as aiModel from "@miz/ai/src/models/ai";
import { explain } from "@miz/ai/src/service/ai";
import { Structs, type GroupMessage } from "node-napcat-ts";

const info = {
  name: "锐评",
  comment: [`使用 "锐评 [要锐评的图]" 命令锐评图片`],
  plugin,
};
async function plugin(event: GroupMessage) {
  const images: Array<Buffer<ArrayBuffer>> = [];
  for (const msg of event.message) {
    if (msg.type === "reply") {
      const message = await getGroupMsg(msg.data.id);
      if (!message) continue;
      for (const msg of message.message) {
        if (msg.type === "image") {
          const image = await urlToBuffer(msg.data.url);
          if (!image) continue;
          images.push(image);
        }
      }
    }
    if (msg.type === "image") {
      const image = await urlToBuffer(msg.data.url);
      if (!image) continue;
      images.push(image);
    }
  }
  if (!images.length) {
    await sendGroupMsg(event.group_id, [
      Structs.reply(event.message_id),
      Structs.text(`没发现图片,锐评功能需要引用图片消息,或在消息内附带图片`),
    ]);
    return;
  }

  const prompt = await aiModel.find("锐评");
  if (!prompt) {
    await sendGroupMsg(event.group_id, [
      Structs.reply(event.message_id),
      Structs.text(`系统未录入识图AI,请联系系统管理员`),
    ]);
    return;
  }
  const replyMsg = await explain(images, prompt.prompt);
  if (!replyMsg || replyMsg.trim() === prompt.prompt) {
    await sendGroupMsg(event.group_id, [
      Structs.reply(event.message_id),
      Structs.text(`识图AI繁忙，请稍后再试`),
    ]);
    return;
  }
  await sendGroupMsg(event.group_id, [
    Structs.reply(event.message_id),
    Structs.text(replyMsg),
  ]);
  return;
}

export { info };
