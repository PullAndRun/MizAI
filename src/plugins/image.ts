import Config from "@miz/ai/config/config.toml";
import { CommandText, SendGroupMessage } from "@miz/ai/src/core/bot";
import { Delete, Download, Metadata } from "@miz/ai/src/core/yt-dlp";
import { Baidu, Pixiv } from "@miz/ai/src/service/image";
import { Structs, type GroupMessage } from "node-napcat-ts";

const info = {
  name: "看",
  comment: [
    `使用 "看" 命令查看随机图片`,
    `使用 "看 [看什么图]" 命令看图`,
    `使用 "看 [视频网址]" 命令看视频`,
  ],
  Plugin,
};
async function Plugin(event: GroupMessage) {
  const commandText = CommandText(event.raw_message, [
    Config.Bot.name,
    info.name,
  ]);
  if (!commandText) {
    await SendRandomImage(event);
    return;
  }
  if (commandText.startsWith("http")) {
    await SendVideo(event);
    return;
  }
  await SendSearchImage(event);
}

async function SendSearchImage(event: GroupMessage) {
  const commandText = CommandText(event.raw_message, [
    Config.Bot.name,
    info.name,
  ]);
  const baiduImage = await Baidu(commandText);
  if (!baiduImage) {
    await SendGroupMessage(event.group_id, [
      Structs.reply(event.message_id),
      Structs.text("没找要你要看的图"),
    ]);
    return;
  }
  await SendGroupMessage(event.group_id, [
    Structs.reply(event.message_id),
    Structs.image(baiduImage),
  ]);
}

async function SendRandomImage(event: GroupMessage) {
  const pixiv = await Pixiv();
  if (!pixiv) {
    await SendGroupMessage(event.group_id, [
      Structs.reply(event.message_id),
      Structs.text(`暂时没有随机图片。`),
    ]);
    return;
  }
  await SendGroupMessage(event.group_id, [
    Structs.reply(event.message_id),
    Structs.image(pixiv),
  ]);
}

async function SendVideo(event: GroupMessage) {
  const commandText = CommandText(event.raw_message, [
    Config.Bot.name,
    info.name,
  ]);
  if (
    (!commandText.startsWith("https://www.bilibili.com") ||
      !commandText.includes("https://b23.tv")) &&
    event.sender.user_id !== Config.Bot.admin
  ) {
    await SendGroupMessage(event.group_id, [
      Structs.reply(event.message_id),
      Structs.text(`看视频失败。\n仅支持看哔哩哔哩视频。`),
    ]);
    return;
  }
  const metadata = await Metadata(commandText);
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
  const fileName = await Download(commandText);
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
  await SendGroupMessage(event.group_id, [
    Structs.video(
      "data:video/mp4;base64," + Buffer.from(videoBuffer).toBase64()
    ),
  ]);
  await Delete(fileName);
}

export { info };
