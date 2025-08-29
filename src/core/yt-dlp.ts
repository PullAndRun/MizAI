import Config from "@miz/ai/config/config.toml";
import { randomUUIDv7 } from "bun";
import path from "node:path";
import * as ytdlp from "youtube-dl-exec";

async function Metadata(url: string) {
  const create = ytdlp.create(
    path.resolve(`${Config.Bot.tools_folder}${Config.Bot.ytdlp_file_name}`)
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
    path.resolve(`${Config.Bot.tools_folder}${Config.Bot.ytdlp_file_name}`)
  );
  const fileName = randomUUIDv7();
  await create(url, {
    noPlaylist: true,
    output: path.resolve(`${Config.Ytdlp.video_folder}${fileName}.mp4`),
    ffmpegLocation: path.resolve(
      `${Config.Bot.tools_folder}${Config.Bot.ffmpeg_file_name}`
    ),
    cookies: Config.Ytdlp.cookie,
    format: "(bv*[vcodec~='^((he|a)vc|h26[45])']+ba) / (bv*+ba/b)",
    recodeVideo: "mp4",
    formatSort: [
      "res",
      "ext:mp4:m4a",
    ] as unknown as ytdlp.OptionFormatSortPlus[],
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
