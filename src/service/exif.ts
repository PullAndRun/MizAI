import * as ExifReader from "exifreader";

async function Exif(image: Buffer) {
  const tag = ExifReader.load(image);
  const exifList = [];
  for (const exif of Object.entries(tag)) {
    if (exif[0] === "Thumbnail" || exif[0] === "MakerNote") continue;
    exifList.push(`${JSON.stringify(exif[0])} : ${JSON.stringify(exif[1])}`);
  }
  return exifList;
}

export { Exif };
