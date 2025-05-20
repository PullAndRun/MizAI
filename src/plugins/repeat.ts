import config from "@miz/ai/config/config.toml";
import { message, sendGroupMsg } from "@miz/ai/src/core/bot";
import { Structs } from "node-napcat-ts";

const info = {
  name: "复读=>无法调用",
  comment: ["内置复读功能"],
  plugin,
};

const repeatMap: Map<number, { msg: string; count: number }> = new Map();
async function plugin(event: groupMessageEvent) {
  const msgEvent = await message(event.messageId);
  const rawMsg = msgEvent.raw_message;
  const groupId = event.groupId;
  if (
    rawMsg.trim().startsWith(config.bot.name) ||
    rawMsg.trim().includes(config.bot.nick_name)
  )
    return;
  const repeatItem = repeatMap.get(groupId);
  if (!repeatItem || rawMsg !== repeatItem.msg) {
    repeatMap.set(groupId, { msg: rawMsg, count: 1 });
    return;
  }
  const newCount = repeatItem.count + 1;
  if (newCount === config.bot.repeat) {
    await sendGroupMsg(groupId, [Structs.forward(msgEvent.message_id)]);
  }
  repeatMap.set(groupId, {
    msg: rawMsg,
    count: newCount,
  });
}

export { info };
