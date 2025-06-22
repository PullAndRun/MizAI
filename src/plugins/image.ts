import config from "@miz/ai/config/config.toml";
import { cmdText, getGroupMsg, sendGroupMsg } from "@miz/ai/src/core/bot";
import { urlToBuffer } from "@miz/ai/src/core/http";
import * as aiModel from "@miz/ai/src/models/ai";
import { explain } from "@miz/ai/src/service/ai";
import { baiduSearch } from "@miz/ai/src/service/image";
import { Structs, type GroupMessage } from "node-napcat-ts";

const info = {
  name: "看",
  comment: [`使用 "看 [要看的图]" 命令看图`],
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
  if (images.length) {
    const prompt = await aiModel.find("识图");
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
  const msg = cmdText(event.raw_message.replace(/\[.*?\]/g, ""), [
    config.bot.name,
    info.name,
  ]);
  if (!msg) {
    await sendGroupMsg(event.group_id, [
      Structs.reply(event.message_id),
      Structs.text(`命令错误，请使用 "看 [要看的图]" 命令看图`),
    ]);
    return;
  }
  const image = await baiduSearch(msg);
  if (!image) {
    await sendGroupMsg(event.group_id, [
      Structs.reply(event.message_id),
      Structs.text("没找要你要看的图"),
    ]);
    return;
  }
  await sendGroupMsg(event.group_id, [
    Structs.reply(event.message_id),
    Structs.image(image),
  ]);
}

export { info };
