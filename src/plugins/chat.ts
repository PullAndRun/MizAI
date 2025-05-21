import config from "@miz/ai/config/config.toml";
import { cmdText, sendGroupMsg } from "@miz/ai/src/core/bot";
import * as groupModel from "@miz/ai/src/models/group";
import * as aiModel from "@miz/ai/src/models/ai";
import { Structs, type GroupMessage } from "node-napcat-ts";
import type { ChatCompletionMessageParam } from "openai/resources.mjs";
import { deepSeekChat } from "../service/ai";

const info = {
  name: "聊天=>无法调用",
  comment: [`内置AI聊天功能`],
  plugin,
};

async function plugin(event: GroupMessage) {
  const msg = cmdText(event.raw_message, [config.bot.name]);
  if (!msg) return;
  const group = await groupModel.findOrAdd(event.group_id);
  const prompt = await aiModel.find(group.prompt);
  if (!prompt) {
    await sendGroupMsg(event.group_id, [
      Structs.reply(event.message_id),
      Structs.text("本群没录入prompt,请联系管理员"),
    ]);
    return;
  }
  const chatText = await chat(msg, prompt.prompt);
  if (!chatText) {
    await sendGroupMsg(event.group_id, [
      Structs.reply(event.message_id),
      Structs.text("机器人cpu过热\n请稍候重试。"),
    ]);
    return;
  }
  await sendGroupMsg(event.group_id, [
    Structs.reply(event.message_id),
    Structs.text(chatText.replace(/^(\n+)/g, "").replace(/\n+/g, "\n\n")),
  ]);
}

async function chat(msg: string, prompt: string) {
  const message: ChatCompletionMessageParam[] = [
    { role: "user", content: msg },
  ];
  if (prompt !== "默认") {
    message.unshift({ role: "system", content: prompt });
  }
  return deepSeekChat(message);
}

export { info };
