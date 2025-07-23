import { GetMessage, SendGroupMessage } from "@miz/ai/src/core/bot";
import { UrlToBuffer } from "@miz/ai/src/core/http";
import { Exif } from "@miz/ai/src/service/exif";
import { Structs, type GroupMessage } from "node-napcat-ts";

const info = {
  name: "exif",
  comment: [`使用 "exif" 命令查询图片exif信息`],
  Plugin,
};

async function Plugin(event: GroupMessage) {
  if (!event.raw_message) {
    await SendGroupMessage(event.group_id, [
      Structs.reply(event.sender.user_id),
      Structs.text(`请确认消息内包含图片`),
    ]);
    return;
  }
  const exifs: string[] = [];
  const urls: string[] = [];
  for (const message of event.message) {
    if (message.type === "reply") {
      const replyMsg = await GetMessage(Number.parseFloat(message.data.id));
      if (!replyMsg) continue;
      for (const reply of replyMsg.message) {
        if (reply.type === "image") {
          urls.push(reply.data.url);
        }
      }
    }
    if (message.type === "image") {
      urls.push(message.data.url);
    }
  }
  for (const url of urls) {
    const imageBuffer = await UrlToBuffer(url);
    if (!imageBuffer) continue;
    const exif = await Exif(imageBuffer);
    exifs.push(exif.join("\n"));
  }
  const exifList = exifs.map((v, i) => {
    return Structs.customNode([Structs.text(`第 ${i + 1} 张:\n${v}`)]);
  });
  if (!exifList.length) {
    await SendGroupMessage(event.group_id, [
      Structs.reply(event.sender.user_id),
      Structs.text(`请确认消息内包含图片`),
    ]);
    return;
  }
  await SendGroupMessage(event.group_id, exifList);
}

export { info };
