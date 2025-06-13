import config from "@miz/ai/config/config.toml";
import { sendGroupMsg } from "@miz/ai/src/core/bot";
import dayjs from "dayjs";
import { Structs, type GroupMessage } from "node-napcat-ts";
import { fetchEarthquake } from "../service/earthquake";

const info = {
  name: "地震",
  comment: [`使用 "地震" 命令查询近期地震`],
  plugin,
};

async function plugin(event: GroupMessage) {
  const earthquakeList = await fetchEarthquake(config.earthquake.level);
  if (!earthquakeList) {
    await sendGroupMsg(event.group_id, [
      Structs.reply(event.message_id),
      Structs.text(`近期没有大于 ${config.earthquake.level} 级的地震`),
    ]);
    return;
  }
  await sendGroupMsg(event.group_id, [
    Structs.reply(event.message_id),
    Structs.text(
      earthquakeList
        .map((v, i) => {
          return `=> 地震编号:${i + 1}\n📌 震情速递: "${
            v.title
          }"\n💬 地震详情: ${v.description}\n⏰ 地震时间: ${dayjs(
            v.pubDate
          ).format("YYYY年MM月DD日 HH点mm分ss秒")}\n👉 官方讯息: ${v.link}`;
        })
        .filter((_, i) => i < 10)
        .join("\n\n")
    ),
  ]);
}

export { info };
