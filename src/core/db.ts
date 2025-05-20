import config from "@miz/ai/config/config.toml";
import { logger } from "@miz/ai/src/core/log";
import { DataSource } from "typeorm";

const db = new DataSource({
  ...config.database,
});

async function init() {
  await db.initialize().catch((e) => {
    logger.error(`数据库连接失败\n原因:\n${JSON.stringify(e)}`);
    throw new Error(`数据库连接失败\n原因:\n${JSON.stringify(e)}`);
  });
  if (db.isInitialized) {
    logger.info("数据库连接成功");
  }
}

export { db, init };
