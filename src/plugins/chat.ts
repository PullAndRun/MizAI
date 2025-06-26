import type { ContentListUnion, Part } from "@google/genai";
import config from "@miz/ai/config/config.toml";
import { cmdText, getGroupMsg, sendGroupMsg } from "@miz/ai/src/core/bot";
import { urlToParts } from "@miz/ai/src/core/util";
import * as aiModel from "@miz/ai/src/models/ai";
import * as groupModel from "@miz/ai/src/models/group";
import { deepSeekChat, geminiChat } from "@miz/ai/src/service/ai";
import { sleep } from "bun";
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
  // if (msg.includes(config.bot.nick_name)) {
  //   await contextChat(event);
  //   return;
  // }
  await singleChat(event);
}

// async function contextChat(event: GroupMessage) {
//   const rawMessage = await botMessage(event);
//   const messageList: {
//     text: {
//       user_id: number;
//       nickname: string;
//       message_id: number;
//     };
//     history: string;
//     images: Part[];
//   }[] = [];
//   const contentListUnion: ContentListUnion = [];
//   const history = await getClient()
//     .get_group_msg_history({
//       group_id: event.group_id,
//       count: config.bot.history_length,
//     })
//     .catch((_) => undefined);
//   if (!history) {
//     await sendGroupMsg(event.group_id, [
//       Structs.reply(event.message_id),
//       Structs.text("获取群聊历史记录失败"),
//     ]);
//     return;
//   }
//   history.messages.splice(-1, 1);
//   for (const message of history.messages) {
//     if (message.message_type !== "group") continue;
//     const images: Part[] = [];
//     const texts: string[] = [];
//     for (const msg of message.message) {
//       if (msg.type === "reply") {
//         texts.push(`[reply_message_id:${msg.data.id}]`);
//       }
//       if (msg.type === "text") {
//         texts.push(msg.data.text);
//       }
//       if (msg.type === "image") {
//         const parts = await urlToParts(msg.data.url);
//         if (!parts) continue;
//         images.push(parts);
//       }
//     }
//     messageList.push({
//       text: {
//         user_id: message.user_id,
//         nickname: message.sender.card || message.sender.nickname,
//         message_id: message.message_id,
//       },
//       history: texts.join(""),
//       images: images,
//     });
//   }
//   for (const message of messageList) {
//     const parts: Part[] = [];
//     parts.push({
//       text: `群员信息：${JSON.stringify(message.text)}，聊天内容：${
//         message.history
//       }`,
//     });
//     if (message.images.length) {
//       parts.push(...message.images);
//     }
//     gemini.push({
//       role: "user",
//       parts: parts,
//     });
//   }
//   gemini.push({
//     role: "user",
//     parts: [{ text: botMsg }],
//   });
//   const prompt = await aiModel.find("说中文");
//   if (!prompt) {
//     await sendGroupMsg(event.group_id, [
//       Structs.reply(event.message_id),
//       Structs.text("本群没录入prompt,请联系管理员"),
//     ]);
//     return;
//   }
//   const chatText = await geminiChat(gemini, prompt.prompt);
//   if (!chatText) {
//     await sendGroupMsg(event.group_id, [
//       Structs.reply(event.message_id),
//       Structs.text("机器人cpu过热\n请稍候重试。"),
//     ]);
//     return;
//   }
//   for (const text of chatText) {
//     if (!text.text) continue;
//     const reply = text.text.replace(/^(\n+)/g, "").replace(/\n+/g, "\n");
//     const match = reply.match(/聊天内容：\s*([\s\S]*)/);
//     if (!match) {
//       await sendGroupMsg(event.group_id, [Structs.text(reply)]);
//       await sleep(1000);
//       continue;
//     }
//     if (!match[1]) continue;
//     await sendGroupMsg(event.group_id, [Structs.text(match[1])]);
//     await sleep(1000);
//   }
// }

async function singleChat(event: GroupMessage) {
  const deepseek: ChatCompletionMessageParam[] = [];
  const gemini: ContentListUnion = [];
  const images: Part[] = [];
  for (const msg of event.message) {
    if (msg.type === "reply") {
      const message = await getGroupMsg(msg.data.id);
      if (!message) continue;
      for (const msg of message.message) {
        if (msg.type === "text") {
          deepseek.push({
            role: "assistant",
            content: cmdText(msg.data.text, [config.bot.name]),
          });
          gemini.push({
            role: "model",
            parts: [{ text: cmdText(msg.data.text, [config.bot.name]) }],
          });
        }
        if (msg.type === "image") {
          const parts = await urlToParts(msg.data.url);
          if (!parts) continue;
          images.push(parts);
        }
      }
    }
    if (msg.type === "image") {
      const parts = await urlToParts(msg.data.url);
      if (!parts) continue;
      images.push(parts);
    }
    if (msg.type === "text") {
      gemini.push({
        role: "user",
        parts: [{ text: cmdText(msg.data.text, [config.bot.name]) }],
      });
      deepseek.push({
        role: "user",
        content: cmdText(msg.data.text, [config.bot.name]),
      });
    }
  }
  //如果有图就用gemini
  if (images.length) {
    const prompt = await aiModel.find("说中文");
    if (!prompt) {
      await sendGroupMsg(event.group_id, [
        Structs.reply(event.message_id),
        Structs.text("本群没录入prompt,请联系管理员"),
      ]);
      return;
    }
    gemini.push({
      role: "user",
      parts: images,
    });
    const chatText = await geminiChat(gemini, prompt.prompt);
    if (!chatText) {
      await sendGroupMsg(event.group_id, [
        Structs.reply(event.message_id),
        Structs.text("机器人cpu过热\n请稍候重试。"),
      ]);
      return;
    }
    for (const text of chatText) {
      if (!text.text) continue;
      await sendGroupMsg(event.group_id, [
        Structs.reply(event.message_id),
        Structs.text(text.text.replace(/^(\n+)/g, "").replace(/\n+/g, "\n")),
      ]);
      await sleep(1000);
    }
  }
  //如果没图就用deepseek
  if (!images.length) {
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
      deepseek.unshift({ role: "system", content: prompt.prompt });
    }
    const chatText = await deepSeekChat(deepseek);
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
