import config from "@miz/ai/config/config.toml";
import { forwardGroupMsg } from "@miz/ai/src/core/bot";
import { type GroupMessage } from "node-napcat-ts";

const info = {
  name: "复读=>无法调用",
  comment: ["内置复读功能"],
  plugin,
};

const repeatMap: Map<number, { msg: string; count: number }> = new Map();
async function plugin(event: GroupMessage) {
  const { group_id } = event;
  const raw_message = event.raw_message.replace(/url=\S+,/g, "");
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
  repeatMap.set(group_id, {
    msg: raw_message,
    count: newCount,
  });
  if (newCount !== config.bot.repeat) return;
  await forwardGroupMsg(group_id, event.message_id);
}

export { info };
