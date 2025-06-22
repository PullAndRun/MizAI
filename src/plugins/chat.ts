import config from "@miz/ai/config/config.toml";
import { cmdText, getGroupMsg, sendGroupMsg } from "@miz/ai/src/core/bot";
import * as aiModel from "@miz/ai/src/models/ai";
import * as groupModel from "@miz/ai/src/models/group";
import { deepSeekChat } from "@miz/ai/src/service/ai";
import { Structs, type GroupMessage } from "node-napcat-ts";
import type { ChatCompletionMessageParam } from "openai/resources.mjs";

const info = {
  name: "聊天=>无法调用",
  comment: [`内置AI聊天功能`],
  plugin,
};

async function plugin(event: GroupMessage) {
  const msg = cmdText(event.raw_message, [config.bot.name]);
  if (!msg) return;
  const texts: ChatCompletionMessageParam[] = [];
  for (const msg of event.message) {
    if (msg.type === "reply") {
      const message = await getGroupMsg(msg.data.id);
      if (!message) continue;
      for (const msg of message.message) {
        if (msg.type === "text") {
          texts.push({
            role: "assistant",
            content: cmdText(msg.data.text, [config.bot.name]),
          });
        }
      }
    }
    if (msg.type === "text") {
      texts.push({
        role: "user",
        content: cmdText(msg.data.text, [config.bot.name]),
      });
    }
  }
  if (texts.length) {
    const group = await groupModel.findOrAdd(event.group_id);
    const prompt = await aiModel.find(group.prompt);
    if (!prompt) {
      await sendGroupMsg(event.group_id, [
        Structs.reply(event.message_id),
        Structs.text("本群没录入prompt,请联系管理员"),
      ]);
      return;
    }
    if (prompt.name !== "默认") {
      texts.unshift({ role: "system", content: prompt.prompt });
    }
    const chatText = await deepSeekChat(texts);
    if (!chatText) {
      await sendGroupMsg(event.group_id, [
        Structs.reply(event.message_id),
        Structs.text("机器人cpu过热\n请稍候重试。"),
      ]);
      return;
    }
    await sendGroupMsg(event.group_id, [
      Structs.reply(event.message_id),
      Structs.text(chatText.replace(/^(\n+)/g, "").replace(/\n+/g, "\n")),
    ]);
  }
}

export { info };
