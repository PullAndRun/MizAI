import { readdir } from "node:fs/promises";
import path from "node:path";
import { file } from "bun";

async function joke() {
  const jokeDir = path.resolve("resource/miHoYoJokes");
  const files = await readdir(jokeDir, {
    withFileTypes: true,
    recursive: true,
  });
  const jpgFiles = files.filter(
    (file) => file.isFile() && file.name.endsWith(".jpg")
  );
  if (!jpgFiles.length) return undefined;
  const randomFile = jpgFiles[Math.floor(Math.random() * jpgFiles.length)];
  if (!randomFile) return;
  const filePath = path.resolve(randomFile.parentPath + "/" + randomFile.name);
  const readFile = file(filePath);
  const fileArrayBuffer = await readFile.arrayBuffer();
  return Buffer.from(fileArrayBuffer);
}

export { joke };
