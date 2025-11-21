import Config from "miz/config/config.toml";
import {
  Message,
  SendGroupMessage,
  SendSegmentMessage,
} from "miz/src/core/bot";
import { Delete, Download, Metadata } from "miz/src/core/yt-dlp";
import { RandomImage } from "miz/src/service/image";
import { Structs, type GroupMessage } from "node-napcat-ts";

const info = {
  name: "看",
  comment: [`使用 "看" 命令查看随机图片`, `使用 "看 [视频网址]" 命令看视频`],
  Plugin,
};

async function Plugin(event: GroupMessage) {
  const message = Message(event.message, [Config.Bot.name, info.name]);
  const urlList = message.match(/(https?:\/\/[^\s]+)/i) || [];
  const url = urlList[0];
  if (url) {
    await SendVideo(event, url);
    return;
  }
  await SendRandomImage(event);
}

async function SendRandomImage(event: GroupMessage) {
  const randomImage = await RandomImage();
  if (!randomImage) {
    await SendGroupMessage(event.group_id, [
      Structs.reply(event.message_id),
      Structs.text(`暂时没有随机图片。`),
    ]);
    return;
  }
  await SendGroupMessage(event.group_id, [
    Structs.reply(event.message_id),
    Structs.image(randomImage),
  ]);
}

async function SendVideo(event: GroupMessage, url: string) {
  if (
    !url.includes("bilibili") &&
    !url.includes("b23.tv") &&
    event.sender.user_id !== Config.Bot.admin &&
    !(<number[]>Config.Bot.whiteList).includes(event.sender.user_id)
  ) {
    await SendGroupMessage(event.group_id, [
      Structs.reply(event.message_id),
      Structs.text(`看视频失败。\n仅支持看哔哩哔哩视频。`),
    ]);
    return;
  }
  const metadata = await Metadata(url);
  if (!metadata) {
    await SendGroupMessage(event.group_id, [
      Structs.reply(event.message_id),
      Structs.text(`看视频失败。\n您要看的视频下载失败，请检查视频网址。`),
    ]);
    return;
  }
  if (metadata.duration > Config.Ytdlp.duration * 60) {
    await SendGroupMessage(event.group_id, [
      Structs.reply(event.message_id),
      Structs.text(
        `看视频失败。\n仅支持时长小于 ${Config.Ytdlp.duration} 分钟的视频。`
      ),
    ]);
    return;
  }
  const fileName = await Download(url);
  const videoBuffer = await Bun.file(Config.Ytdlp.video_folder + fileName)
    .arrayBuffer()
    .catch((_) => undefined);
  if (!videoBuffer) {
    await SendGroupMessage(event.group_id, [
      Structs.reply(event.message_id),
      Structs.text(`看视频失败。\n视频解码失败。`),
    ]);
    await Delete(fileName);
    return;
  }
  await SendSegmentMessage(event.group_id, [
    [
      Structs.video(
        "data:video/mp4;base64," + Buffer.from(videoBuffer).toBase64()
      ),
    ],
  ]);
  await SendGroupMessage(event.group_id, [
    Structs.reply(event.message_id),
    Structs.text(`已为您推送视频。`),
  ]);
  await Delete(fileName);
}

export { info };
