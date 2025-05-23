import { logger } from "@miz/ai/src/core/log";
import type { GroupMessage } from "node-napcat-ts";
import { readdir } from "node:fs/promises";
import path from "node:path";

interface Plugin {
  name: string;
  comment: Array<string>;
  plugin: (event: GroupMessage) => Promise<void>;
}

const plugins: Plugin[] = [];

async function load() {
  const pluginDir = path.resolve("src/plugins");
  const files = await readdir(pluginDir);
  for (const file of files) {
    if (!file.endsWith(".js") && !file.endsWith(".ts")) continue;
    const pluginPath = path.join(pluginDir, file);
    try {
      const { info } = await import(pluginPath);
      if (!info || !info.name || !info.plugin) continue;
      plugins.push(info);
    } catch (err) {
      logger.error(
        `加载插件失败\n->插件名: ${file}\n->错误:\n${JSON.stringify(err)}`
      );
    }
  }
  plugins.sort((a, b) => b.name.length - a.name.length);
  logger.info(`成功加载 ${plugins.length} 个插件`);
}

function pick(msg: string) {
  return plugins.find((p) => msg.startsWith(p.name));
}

async function init() {
  await load();
}

export { init, pick, plugins };
