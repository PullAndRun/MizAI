import config from "@miz/ai/config/config.toml";
import {
  cmdText,
  getClient,
  getGroupMsg,
  sendGroupMsg,
} from "@miz/ai/src/core/bot";
import { urlToOpenAIImages } from "@miz/ai/src/core/util";
import * as aiModel from "@miz/ai/src/models/ai";
import * as groupModel from "@miz/ai/src/models/group";
import { deepSeekChat, geminiChat } from "@miz/ai/src/service/ai";
import { Structs, type GroupMessage, type Receive } from "node-napcat-ts";
import type {
  ChatCompletionContentPart,
  ChatCompletionContentPartImage,
  ChatCompletionMessageParam,
} from "openai/resources.mjs";

const info = {
  name: "聊天=>无法调用",
  comment: [`内置AI聊天功能`],
  plugin,
};

async function plugin(event: GroupMessage) {
  const msg = cmdText(event.raw_message, [config.bot.name]);
  if (!msg) return;
  if (msg.includes(config.bot.nick_name)) {
    await contextChat(event);
    return;
  }
  await singleChat(event);
}

async function contextChat(event: GroupMessage) {
  const getHistorys = await getClient().get_group_msg_history({
    group_id: event.group_id,
    count: config.bot.history_length,
  });
  const historys = getHistorys.messages;
  const gemini: ChatCompletionMessageParam[] = [];
  for (const history of historys) {
    for (const message of history.message) {
      const content: ChatCompletionContentPart[] = [];
      content.push({
        type: "text",
        text: `
        [metadata]\n
        nickname:${history.sender.card || history.sender.nickname}\n
        message_id:${history.message_id}
        `,
      });
      if (message.type === "reply") {
        content.push({
          type: "text",
          text: `
          [reply_message]
          message_id:${message.data.id}`,
        });
      }
      if (message.type === "text") {
        content.push({
          type: "text",
          text: `
          [message]
          text:${message.data.text}`,
        });
      }
      if (message.type === "image") {
        const image = await urlToOpenAIImages(message.data.url);
        if (image) {
          content.push(image);
        }
      }
      gemini.push({ role: "user", content: content });
    }
  }
  const prompt = await aiModel.find("gemini");
  if (!prompt) {
    await sendGroupMsg(event.group_id, [
      Structs.reply(event.message_id),
      Structs.text("本群没录入prompt,请联系管理员"),
    ]);
    return;
  }
  const chatText = await geminiChat(gemini, prompt.prompt);
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

async function receiveSplit(message: Receive[keyof Receive]) {
  const deepseek: ChatCompletionMessageParam[] = [];
  const gemini: ChatCompletionMessageParam[] = [];
  const content: ChatCompletionContentPart[] = [];
  const images: ChatCompletionContentPartImage[] = [];
  if (message.type === "text") {
    content.push({
      type: "text",
      text: cmdText(message.data.text, [config.bot.name]),
    });
  }
  if (message.type === "image") {
    const image = await urlToOpenAIImages(message.data.url);
    if (image) {
      content.push(image);
      images.push(image);
    }
  }
  deepseek.push({
    role: "user",
    content: content,
  });
  gemini.push({
    role: "user",
    content: content,
  });
  return {
    deepseek,
    gemini,
    images,
  };
}

async function singleChat(event: GroupMessage) {
  const deepseek: ChatCompletionMessageParam[] = [];
  const gemini: ChatCompletionMessageParam[] = [];
  const images: ChatCompletionContentPartImage[] = [];
  for (const msg of event.message) {
    if (msg.type === "reply") {
      const message = await getGroupMsg(msg.data.id);
      if (!message) continue;
      for (const msg of message.message) {
        const receive = await receiveSplit(msg);
        deepseek.push(...receive.deepseek);
        gemini.push(...receive.gemini);
        images.push(...receive.images);
      }
    }
    const receive = await receiveSplit(msg);
    deepseek.push(...receive.deepseek);
    gemini.push(...receive.gemini);
    images.push(...receive.images);
  }
  //如果有图就用gemini
  if (images.length) {
    const prompt = await aiModel.find("gemini");
    if (!prompt) {
      await sendGroupMsg(event.group_id, [
        Structs.reply(event.message_id),
        Structs.text("本群没录入prompt,请联系管理员"),
      ]);
      return;
    }
    const chatText = await geminiChat(gemini, prompt.prompt);
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
    return;
  }
  //如果没图就用deepseek
  const group = await groupModel.findOrAdd(event.group_id);
  const findPrompt = await aiModel.find(group.prompt);
  if (!findPrompt) {
    await sendGroupMsg(event.group_id, [
      Structs.reply(event.message_id),
      Structs.text("本群没录入prompt,请联系管理员"),
    ]);
    return;
  }
  const prompt = () => {
    if (findPrompt.name === "默认") return undefined;
    return findPrompt.prompt;
  };
  const chatText = await deepSeekChat(deepseek, prompt());
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

export { info };
