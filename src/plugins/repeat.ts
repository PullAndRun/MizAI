import config from "@miz/ai/config/config.toml";
import { sendGroupMsg } from "@miz/ai/src/core/bot";
import { Structs, type GroupMessage } from "node-napcat-ts";

const info = {
  name: "复读=>无法调用",
  comment: ["内置复读功能"],
  plugin,
};

const repeatMap: Map<number, { msg: string; count: number }> = new Map();
async function plugin(event: GroupMessage) {
  const { raw_message, group_id } = event;
  if (
    raw_message.trim().startsWith(config.bot.name) ||
    raw_message.trim().includes(config.bot.nick_name)
  )
    return;
  const repeatItem = repeatMap.get(group_id);
  if (!repeatItem || raw_message !== repeatItem.msg) {
    repeatMap.set(group_id, { msg: raw_message, count: 1 });
    return;
  }
  const newCount = repeatItem.count + 1;
  if (newCount === config.bot.repeat) {
    await sendGroupMsg(group_id, [Structs.text(event.raw_message)]);
  }
  repeatMap.set(group_id, {
    msg: raw_message,
    count: newCount,
  });
}

export { info };
