import Config from "@miz/ai/config/config.toml";
import { UrlToBase64 } from "@miz/ai/src/core/puppeteer";
import dayjs from "dayjs";

const imageInfo: { image: Buffer<ArrayBuffer> | undefined; date: string } = {
  image: undefined,
  date: "",
};

async function Weather() {
  const date = dayjs().format("YYYY-MM-DD");
  if (imageInfo.date === date) {
    return imageInfo.image;
  }
  const image = await UrlToBase64(Config.Weather.url, "#text");
  if (!image) return undefined;
  imageInfo.image = image;
  imageInfo.date = date;
  return imageInfo.image;
}

export { Weather };
