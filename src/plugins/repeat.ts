import Config from "@miz/ai/config/config.toml";
import { ForwardGroupMsg } from "@miz/ai/src/core/bot";
import { type GroupMessage } from "node-napcat-ts";

const info = {
  name: "复读=>无法调用",
  comment: ["内置复读功能"],
  Plugin,
};

const repeatMap: Map<number, { message: string; count: number }> = new Map();

async function Plugin(event: GroupMessage) {
  const { group_id } = event;
  const raw_message = event.raw_message.replace(/url=\S+,/g, "");
  if (
    raw_message.trim().startsWith(Config.Bot.name) ||
    raw_message.trim().includes(Config.Bot.nickname)
  )
    return;
  const repeatItem = repeatMap.get(group_id);
  if (!repeatItem || raw_message !== repeatItem.message) {
    repeatMap.set(group_id, { message: raw_message, count: 1 });
    return;
  }
  const newCount = repeatItem.count + 1;
  repeatMap.set(group_id, {
    message: raw_message,
    count: newCount,
  });
  if (newCount !== Config.Bot.repeat) return;
  await ForwardGroupMsg(group_id, event.message_id);
}

export { info };
