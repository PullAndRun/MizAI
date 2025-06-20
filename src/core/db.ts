import config from "@miz/ai/config/config.toml";
import { logger } from "@miz/ai/src/core/log";
import * as aiModel from "@miz/ai/src/models/ai";
import * as earthquakeModel from "@miz/ai/src/models/earthquake";
import { fetchEarthquake } from "@miz/ai/src/service/earthquake";
import { DataSource } from "typeorm";

const db = new DataSource({
  ...config.database,
});

async function setDefaultData() {
  //初始化地震数据库的数据
  const earthquakeCount = await earthquakeModel.count();
  const earthquakeList = await fetchEarthquake(config.earthquake.level);
  if (!earthquakeCount && earthquakeList && earthquakeList.length) {
    for (const earthquake of earthquakeList) {
      await earthquakeModel.add(
        earthquake.title,
        earthquake.description,
        earthquake.link,
        earthquake.pubDate
      );
    }
    logger.info(
      `初始化了earthquake数据库,增加了 ${earthquakeList.length} 条数据`
    );
  }
  //初始化ai数据库的数据
  const aiCount = await aiModel.count();
  if (!aiCount) {
    await aiModel.add("默认", "");
    logger.info(`初始化了ai数据库,增加了 1 条数据`);
  }
}

async function init() {
  await db.initialize().catch((e) => {
    logger.error(`数据库连接失败\n原因:\n${JSON.stringify(e)}`);
    throw new Error(`数据库连接失败\n原因:\n${JSON.stringify(e)}`);
  });
  if (db.isInitialized) {
    logger.info("数据库连接成功");
  }
  await setDefaultData();
}

export { db, init };
