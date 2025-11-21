import dayjs from "dayjs";
import Config from "miz/config/config.toml";
import { SendGroupMessage } from "miz/src/core/bot";
import { Earthquake } from "miz/src/service/earthquake";
import { Structs, type GroupMessage } from "node-napcat-ts";

const info = {
  name: "地震",
  comment: [`使用 "地震" 命令查询近期地震`],
  Plugin,
};

async function Plugin(event: GroupMessage) {
  const earthquake = await Earthquake(Config.Earthquake.level);
  if (!earthquake || !earthquake.length) {
    await SendGroupMessage(event.group_id, [
      Structs.reply(event.message_id),
      Structs.text(`近期没有大于 ${Config.Earthquake.level} 级的地震`),
    ]);
    return;
  }
  await SendGroupMessage(event.group_id, [
    Structs.reply(event.message_id),
    Structs.text(
      earthquake
        .map((v, i) => {
          return `=> 地震编号:${i + 1}\n📌 震情速递: "${
            v.title
          }"\n💬 地震详情: ${v.description}\n⏰ 地震时间: ${dayjs(
            v.pubDate
          ).format("YYYY年MM月DD日 HH点mm分ss秒")}`;
        })
        .filter((_, i) => i < 10)
        .join("\n\n")
    ),
  ]);
}

export { info };
