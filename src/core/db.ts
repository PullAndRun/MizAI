import Config from "miz/config/config.toml";
import { Logger } from "miz/src/core/log";
import { DataSource } from "typeorm";

const dataSource = new DataSource({
  ...Config.Database,
});

async function Init() {
  await dataSource.initialize().catch((e) => {
    throw new Error(`数据库连接失败\n原因:\n${JSON.stringify(e)}`);
  });
  if (dataSource.isInitialized) {
    Logger.info("数据库连接成功");
  }
}

export { dataSource, Init };
