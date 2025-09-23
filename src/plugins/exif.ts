import { GetMessage, SendGroupMessage } from "miz/src/core/bot";
import { UrlToBuffer } from "miz/src/core/http";
import { Exif } from "miz/src/service/exif";
import { Structs, type GroupMessage, type NodeSegment } from "node-napcat-ts";

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
  const nodeSegment: NodeSegment[] = [];
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
    nodeSegment.push(
      Structs.customNode([
        Structs.image(imageBuffer),
        Structs.text(exif.join("\n").replace(/\"base64\":\".*?\"/g, "")),
      ])
    );
  }
  if (!nodeSegment.length) {
    await SendGroupMessage(event.group_id, [
      Structs.reply(event.sender.user_id),
      Structs.text(`请确认消息内包含图片`),
    ]);
    return;
  }
  await SendGroupMessage(event.group_id, nodeSegment);
}

export { info };
