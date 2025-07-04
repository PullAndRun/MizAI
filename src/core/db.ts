import Config from "@miz/ai/config/config.toml";
import { Logger } from "@miz/ai/src/core/log";
import * as AIModel from "@miz/ai/src/models/ai";
import * as EarthquakeModel from "@miz/ai/src/models/earthquake";
import { FetchEarthquake } from "@miz/ai/src/service/earthquake";
import { DataSource } from "typeorm";

const dataSource = new DataSource({
  ...Config.Database,
});

async function SetDefaultData() {
  //初始化地震数据库的数据
  const earthquakeCount = await EarthquakeModel.count();
  const fetchEarthquake = await FetchEarthquake(Config.Earthquake.level);
  if (!earthquakeCount && fetchEarthquake && fetchEarthquake.length) {
    for (const earthquake of fetchEarthquake) {
      await EarthquakeModel.add(
        earthquake.title,
        earthquake.description,
        earthquake.link,
        earthquake.pubDate
      );
    }
    Logger.info(
      `初始化了earthquake数据库,增加了 ${fetchEarthquake.length} 条数据`
    );
  }
  //初始化ai数据库的数据
  const aiCount = await AIModel.count();
  if (!aiCount) {
    await AIModel.add("默认", "");
    await AIModel.add("gemini", "");
    Logger.info(`初始化了ai数据库,增加了 ${await AIModel.count()} 条数据`);
  }
}

async function Init() {
  await dataSource.initialize().catch((e) => {
    throw new Error(`数据库连接失败\n原因:\n${JSON.stringify(e)}`);
  });
  if (dataSource.isInitialized) {
    Logger.info("数据库连接成功");
  }
  await SetDefaultData();
}

export { dataSource, Init };
