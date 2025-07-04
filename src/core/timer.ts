import { Logger } from "@miz/ai/src/core/log";
import { readdir } from "node:fs/promises";
import path from "node:path";

async function Load() {
  const timerDirectory = path.resolve("src/timer");
  const files = await readdir(timerDirectory);
  let count = 0;
  for (const file of files) {
    if (!file.endsWith(".js") && !file.endsWith(".ts")) continue;
    const timerPath = path.join(timerDirectory, file);
    try {
      const { task } = await import(timerPath);
      if (task) {
        task();
        count += 1;
      }
    } catch (err) {
      Logger.error(
        `加载计时器失败\n->计时器名: ${file}\n->错误:\n${JSON.stringify(err)}`
      );
    }
  }
  Logger.info(`成功加载 ${count} 个计时器`);
}

async function Init() {
  await Load();
}

export { Init };
