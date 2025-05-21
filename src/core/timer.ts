import { logger } from "@miz/ai/src/core/log";
import { readdir } from "node:fs/promises";
import path from "node:path";

async function load() {
  const pluginDir = path.resolve("src/timer");
  const files = await readdir(pluginDir);
  let count = 0;
  for (const file of files) {
    if (!file.endsWith(".js") && !file.endsWith(".ts")) continue;
    const pluginPath = path.join(pluginDir, file);
    try {
      const { task } = await import(pluginPath);
      if (task) {
        task();
        count += 1;
      }
    } catch (err) {
      logger.error(
        `加载计时器失败\n->计时器名: ${file}\n->错误:\n${JSON.stringify(err)}`
      );
    }
  }
  logger.info(`成功加载 ${count} 个计时器`);
}

async function init() {
  await load();
}

export { init };
