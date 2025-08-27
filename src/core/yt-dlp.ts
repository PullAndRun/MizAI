import Config from "@miz/ai/config/config.toml";
import { randomUUIDv7 } from "bun";
import path from "node:path";
import * as ytdlp from "youtube-dl-exec";

async function Metadata(url: string) {
  const create = ytdlp.create(
    path.resolve(`${Config.Bot.tools_folder}yt-dlp.exe`)
  );
  return create(url, {
    skipDownload: true,
    dumpSingleJson: true,
    noPlaylist: true,
    proxy: Config.Bot.proxy,
  }).catch((_) => undefined);
}

async function Download(url: string) {
  const create = ytdlp.create(
    path.resolve(`${Config.Bot.tools_folder}yt-dlp.exe`)
  );
  const fileName = randomUUIDv7();
  await create(url, {
    noPlaylist: true,
    output: path.resolve(`${Config.Ytdlp.video_folder}${fileName}`),
    ffmpegLocation: path.resolve(`${Config.Bot.tools_folder}ffmpeg.exe`),
    cookies: Config.Ytdlp.cookie,
    format: "(bv*[vcodec~='^((he|a)vc|h26[45])']+ba)",
    proxy: Config.Bot.proxy,
  }).catch((_) => undefined);
  return fileName + ".mp4";
}

async function Delete(fileName: string) {
  await Bun.file(`${Config.Ytdlp.video_folder}${fileName}`)
    .delete()
    .catch((_) => undefined);
}

export { Delete, Download, Metadata };
