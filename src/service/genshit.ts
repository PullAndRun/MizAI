import * as Config from "@miz/ai/config/config.toml";
import { file } from "bun";
import { readdir } from "node:fs/promises";
import path from "node:path";

async function Genshit() {
  const dir = path.resolve(Config.Genshit.dir);
  const files = await readdir(dir, {
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
  const jpgFileBuffer = await file(filePath).arrayBuffer();
  return Buffer.from(jpgFileBuffer);
}

export { Genshit };
