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
    const context = await sendContext(event, groupChat);
    if (context) return;
  } else {
    const context = await sendContext(event, singleChat);
    if (context) return;
  }
  await sendGroupMsg(event.group_id, [
    Structs.reply(event.message_id),
    Structs.text("机器人cpu过热\n请稍候重试。"),
  ]);
}

async function sendContext(
  event: GroupMessage,
  context: (e: GroupMessage) => Promise<string | undefined>
) {
  for (let retry = 0; retry < config.gemini.retry; retry++) {
    const message = await context(event);
    if (message) return message;
    await sleep(config.gemini.sleep * 1000);
  }
  return undefined;
}

async function geminiMessage(messages: WSSendReturn["get_msg"]) {
  const message: ChatCompletionMessageParam[] = [];
  const content: ChatCompletionContentPart[] = [];
  const senderName = messages.sender.card || messages.sender.nickname;
  const text: string[] = [];
  text.push(`<metadata>`);
  text.push(`This is a group message`);
  text.push(`Sender's nickname: ${senderName}`);
  text.push(`</metadata>`);
  for (const message of messages.message) {
    if (message.type === "text") {
      text.push(message.data.text);
    }
    if (message.type === "image") {
      const image = await urlToOpenAIImages(message.data.url);
      if (image) {
        content.push(image);
      }
    }
  }
  content.push({ type: "text", text: text.join("\n") });
  message.push({ role: "user", content: content });
  return message;
}

async function groupChat(event: GroupMessage) {
  const history = await getClient().get_group_msg_history({
    group_id: event.group_id,
    count: config.gemini.history_length,
  });
  const historyMessages = history.messages;
  const chat: ChatCompletionMessageParam[] = [];
  for (const historyMessage of historyMessages) {
    const message = await geminiMessage(historyMessage);
    chat.push(...message);
  }
  const inHistory = historyMessages.find(
    (historyMessages) => historyMessages.message_id === event.message_id
  );
  if (!inHistory) {
    const message = await geminiMessage(event);
    chat.push(...message);
  }
  const prompt = await aiModel.find("gemini");
  if (!prompt) {
    await sendGroupMsg(event.group_id, [
      Structs.reply(event.message_id),
      Structs.text("本群没录入prompt,请联系管理员"),
    ]);
    return "no_prompt";
  }
  const chatText = await geminiChat(chat, prompt.prompt);
  if (!chatText) return undefined;
  await sendGroupMsg(event.group_id, [
    Structs.reply(event.message_id),
    Structs.text(aiMessage(chatText).replace(/^[\s\S]*?<\/metadata>\s*/g, "")),
  ]);
  return chatText;
}

async function receiveSplit(message: Receive[keyof Receive]) {
  const deepseek: ChatCompletionMessageParam[] = [];
  const gemini: ChatCompletionMessageParam[] = [];
  if (message.type === "text") {
    const messageParam: ChatCompletionMessageParam = {
      role: "user",
      content: [
        {
          type: "text",
          text: cmdText(message.data.text, [config.bot.name]),
        },
      ],
    };
    deepseek.push(messageParam);
    gemini.push(messageParam);
  }
  if (message.type === "image") {
    const image = await urlToOpenAIImages(message.data.url);
    if (image) {
      gemini.push({ role: "user", content: [image] });
    }
  }
  return {
    deepseek,
    gemini,
  };
}

async function singleChat(event: GroupMessage) {
  const deepseek: ChatCompletionMessageParam[] = [];
  const gemini: ChatCompletionMessageParam[] = [];
  for (const eventMessage of event.message) {
    if (eventMessage.type === "reply") {
      const replyMessage = await getGroupMsg(eventMessage.data.id);
      if (!replyMessage) continue;
      for (const message of replyMessage.message) {
        const receive = await receiveSplit(message);
        deepseek.push(...receive.deepseek);
        gemini.push(...receive.gemini);
      }
      continue;
    }
    const receive = await receiveSplit(eventMessage);
    deepseek.push(...receive.deepseek);
    gemini.push(...receive.gemini);
  }
  //如果有图就用gemini
  if (deepseek.length !== gemini.length) {
    const prompt = await aiModel.find("gemini");
    if (!prompt) {
      await sendGroupMsg(event.group_id, [
        Structs.reply(event.message_id),
        Structs.text("本群没录入prompt,请联系管理员"),
      ]);
      return "no_prompt";
    }
    const chatText = await geminiChat(gemini, prompt.prompt);
    if (!chatText) return undefined;
    await sendGroupMsg(event.group_id, [
      Structs.reply(event.message_id),
      Structs.text(aiMessage(chatText)),
    ]);
    return chatText;
  }
  //如果没图就用deepseek
  const group = await groupModel.findOrAdd(event.group_id);
  const findPrompt = await aiModel.find(group.prompt);
  if (!findPrompt) {
    await sendGroupMsg(event.group_id, [
      Structs.reply(event.message_id),
      Structs.text("本群没录入prompt,请联系管理员"),
    ]);
    return "no_prompt";
  }
  const prompt = () => {
    if (findPrompt.name === "默认") return undefined;
    return findPrompt.prompt;
  };
  const chatText = await deepSeekChat(deepseek, prompt());
  if (!chatText) return undefined;
  await sendGroupMsg(event.group_id, [
    Structs.reply(event.message_id),
    Structs.text(aiMessage(chatText)),
  ]);
  return chatText;
}

export { info };
