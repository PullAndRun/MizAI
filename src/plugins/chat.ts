import config from "@miz/ai/config/config.toml";
import {
  cmdText,
  getClient,
  getGroupMsg,
  sendGroupMsg,
} from "@miz/ai/src/core/bot";
import { aiMessage, urlToOpenAIImages } from "@miz/ai/src/core/util";
import * as aiModel from "@miz/ai/src/models/ai";
import * as groupModel from "@miz/ai/src/models/group";
import { deepSeekChat, geminiChat } from "@miz/ai/src/service/ai";
import { sleep } from "bun";
import {
  Structs,
  type GroupMessage,
  type Receive,
  type WSSendReturn,
} from "node-napcat-ts";
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
    for (let retry = 0; retry < config.gemini.retry; retry++) {
      const context_chat = await contextChat(event);
      if (context_chat !== "no_reply") return;
      await sleep(config.gemini.sleep * 1000);
    }
    await sendGroupMsg(event.group_id, [
      Structs.reply(event.message_id),
      Structs.text("机器人cpu过热\n请稍候重试。"),
    ]);
  }
  for (let retry = 0; retry < config.gemini.retry; retry++) {
    const single_chat = await singleChat(event);
    if (single_chat !== "no_reply") return;
    await sleep(config.gemini.sleep * 1000);
  }
  await sendGroupMsg(event.group_id, [
    Structs.reply(event.message_id),
    Structs.text("机器人cpu过热\n请稍候重试。"),
  ]);
}

async function geminiContent(messages: WSSendReturn["get_msg"]) {
  const gemini: ChatCompletionMessageParam[] = [];
  const userContent: ChatCompletionContentPart[] = [];
  const senderName = messages.sender.card || messages.sender.nickname;
  const messageList: string[] = [];
  messageList.push(`<metadata>`);
  messageList.push(`This is a group message`);
  messageList.push(`Sender's nickname: ${senderName}`);
  messageList.push(`</metadata>`);
  for (const message of messages.message) {
    if (message.type === "text") {
      messageList.push(message.data.text);
    }
    if (message.type === "image") {
      const image = await urlToOpenAIImages(message.data.url);
      if (image) {
        userContent.push(image);
      }
    }
  }
  userContent.push({ type: "text", text: messageList.join("\n") });
  gemini.push({ role: "user", content: userContent });
  return gemini;
}

async function contextChat(event: GroupMessage) {
  const getHistorys = await getClient().get_group_msg_history({
    group_id: event.group_id,
    count: config.gemini.history_length,
  });
  const historys = getHistorys.messages;
  const gemini: ChatCompletionMessageParam[] = [];
  for (const history of historys.slice(0, -1)) {
    const content = await geminiContent(history);
    gemini.push(...content);
  }
  const content = await geminiContent(event);
  gemini.push(...content);
  const prompt = await aiModel.find("gemini");
  if (!prompt) {
    await sendGroupMsg(event.group_id, [
      Structs.reply(event.message_id),
      Structs.text("本群没录入prompt,请联系管理员"),
    ]);
    return;
  }
  const chatText = await geminiChat(gemini, prompt.prompt);
  if (!chatText) return "no_reply";
  await sendGroupMsg(event.group_id, [
    Structs.reply(event.message_id),
    Structs.text(aiMessage(chatText).replace(/^[\s\S]*?<\/metadata>\s*/g, "")),
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
  for (const eventMsg of event.message) {
    if (eventMsg.type === "reply") {
      const replyMsgs = await getGroupMsg(eventMsg.data.id);
      if (!replyMsgs) continue;
      for (const replyMsg of replyMsgs.message) {
        const receive = await receiveSplit(replyMsg);
        deepseek.push(...receive.deepseek);
        gemini.push(...receive.gemini);
        images.push(...receive.images);
      }
    }
    const receive = await receiveSplit(eventMsg);
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
    if (!chatText) return "no_reply";
    await sendGroupMsg(event.group_id, [
      Structs.reply(event.message_id),
      Structs.text(aiMessage(chatText)),
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
  if (!chatText) return "no_reply";
  await sendGroupMsg(event.group_id, [
    Structs.reply(event.message_id),
    Structs.text(aiMessage(chatText)),
  ]);
}

export { info };
