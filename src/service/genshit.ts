import { readdir } from "node:fs/promises";
import path from "node:path";

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
  return path.resolve(randomFile.parentPath + "/" + randomFile.name);
}

export { joke };
