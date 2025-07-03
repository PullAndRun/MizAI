import type {
  ContentListUnion,
  GenerateContentResponse,
  Part,
} from "@google/genai";
import config from "@miz/ai/config/config.toml";
import {
  cmdText,
  getClient,
  getGroupMsg,
  sendGroupMsg,
} from "@miz/ai/src/core/bot";
import { aiMessage, bufferToBlob_2, urlToBlob_2 } from "@miz/ai/src/core/util";
import * as aiModel from "@miz/ai/src/models/ai";
import * as groupModel from "@miz/ai/src/models/group";
import { deepSeekChat, geminiChat } from "@miz/ai/src/service/ai";
import { baiduSearch } from "@miz/ai/src/service/image";
import { sleep } from "bun";
import {
  Structs,
  type GroupMessage,
  type Receive,
  type WSSendReturn,
} from "node-napcat-ts";
import type { ChatCompletionContentPartText } from "openai/resources.mjs";

const info = {
  name: "聊天=>无法调用",
  comment: [`内置AI聊天功能`],
  plugin,
};

async function plugin(event: GroupMessage) {
  const msg = cmdText(event.raw_message, [config.bot.name]);
  if (!msg) return;
  if (event.raw_message.includes(config.bot.nick_name)) {
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

async function groupChatContent(groupMessage: WSSendReturn["get_msg"]) {
  const gemini: Part[] = [];
  const messages = groupMessage.message;
  const sender = groupMessage.sender.card || groupMessage.sender.nickname;
  gemini.push({
    text: [`Sender: ${sender}`].join("\n"),
  });
  for (const message of messages) {
    if (message.type === "text") {
      gemini.push({
        text: cmdText(message.data.text, [config.bot.name]),
      });
    }
    if (message.type === "image") {
      const image = await urlToBlob_2(message.data.url);
      if (image) {
        gemini.push({ inlineData: image });
      }
    }
  }
  return gemini;
}

async function groupChat(event: GroupMessage) {
  const history = await getClient().get_group_msg_history({
    group_id: event.group_id,
    count: config.gemini.history_length,
  });
  const messages = history.messages;
  const part: Part[] = [];
  for (const message of messages) {
    const historyMsg = await groupChatContent(message);
    part.push(...historyMsg);
  }
  const newMsgInHistory = messages.find(
    (messages) => messages.message_id === event.message_id
  );
  if (!newMsgInHistory) {
    const message = await groupChatContent(event);
    part.push(...message);
  }
  const prompt = await aiModel.find("gemini");
  if (!prompt) return;
  const chatText = await geminiChat(
    [{ role: "user", parts: part }],
    prompt.prompt
  );
  await sendGeminiMsg(event, chatText, prompt.prompt);
  if (!chatText || !chatText.text) return undefined;
  return chatText.text;
}

async function singleChatContent(message: Receive[keyof Receive]) {
  const deepseek: ChatCompletionContentPartText[] = [];
  const gemini: Part[] = [];
  if (message.type === "text") {
    deepseek.push({
      type: "text",
      text: cmdText(message.data.text, [config.bot.name]),
    });
    gemini.push({
      text: cmdText(message.data.text, [config.bot.name]),
    });
  }
  if (message.type === "image") {
    const image = await urlToBlob_2(message.data.url);
    if (image) {
      gemini.push({ inlineData: image });
    }
  }
  return {
    deepseek,
    gemini,
  };
}

async function geminiFunctionCall(
  event: GroupMessage,
  chat: GenerateContentResponse,
  prompt?: string
) {
  if (!chat.text || !chat.functionCalls || !chat.functionCalls[0])
    return undefined;
  const functionCall = chat.functionCalls[0];
  if (functionCall.name === "get_image") {
    let { imageName: imageNames } = <{ imageName: Array<string> }>(
      functionCall.args
    );
    if (!imageNames || !imageNames.length) return undefined;
    for (const imageName of imageNames) {
      const image = await baiduSearch(imageName);
      if (!image) continue;
      const reply = await retryGeminiChat(
        [
          {
            role: "user",
            parts: [{ text: event.raw_message }],
          },
          {
            role: "model",
            parts: [
              { text: aiMessage(chat.text) },
              {
                inlineData: await bufferToBlob_2(image),
              },
              { text: `找到了 ${imageName} 的图片` },
            ],
          },
        ],
        prompt
      );
      if (!reply) {
        await sendGroupMsg(event.group_id, [
          Structs.reply(event.message_id),
          Structs.image(image),
        ]);
        continue;
      }
      await sendGroupMsg(event.group_id, [
        Structs.reply(event.message_id),
        Structs.image(image),
        Structs.text(reply),
      ]);
    }
  }
}

async function sendGeminiMsg(
  event: GroupMessage,
  chat: GenerateContentResponse | undefined,
  prompt?: string
) {
  if (!chat || !chat.text || !chat.candidates) return;
  for (const candidates of chat.candidates) {
    if (!candidates.content || !candidates.content.parts) continue;
    for (const parts of candidates.content.parts) {
      if (!parts.text) continue;
      await sendGroupMsg(event.group_id, [
        Structs.reply(event.message_id),
        Structs.text(aiMessage(parts.text)),
      ]);
      await sleep(config.bot.sleep * 1000);
    }
  }
  await geminiFunctionCall(event, chat, prompt);
}

async function retryGeminiChat(context: ContentListUnion, prompt?: string) {
  for (let retry = 0; retry < config.gemini.retry; retry++) {
    const resp = await geminiChat(context, prompt);
    if (resp && resp.text) return aiMessage(resp.text);
    await sleep(config.bot.sleep * 1000);
  }
}

async function sendDeepseekMsg(
  event: GroupMessage,
  chatText: string | null | undefined
) {
  if (!chatText) return;
  await sendGroupMsg(event.group_id, [
    Structs.reply(event.message_id),
    Structs.text(aiMessage(chatText)),
  ]);
}

async function singleChat(event: GroupMessage) {
  const deepseek: ChatCompletionContentPartText[] = [];
  const gemini: Part[] = [];
  const pushPart = (receive: {
    deepseek: ChatCompletionContentPartText[];
    gemini: Part[];
  }) => {
    deepseek.push(...receive.deepseek);
    gemini.push(...receive.gemini);
  };
  for (const eventMessage of event.message) {
    if (eventMessage.type === "reply") {
      const replyMessage = await getGroupMsg(eventMessage.data.id);
      if (!replyMessage) continue;
      for (const message of replyMessage.message) {
        const receive = await singleChatContent(message);
        pushPart(receive);
      }
      continue;
    }
    const receive = await singleChatContent(eventMessage);
    pushPart(receive);
  }
  //如果有图就用gemini
  if (deepseek.length !== gemini.length) {
    const prompt = await aiModel.find("gemini");
    if (!prompt) {
      await noPrompt(event);
      return undefined;
    }
    const chatText = await geminiChat(
      [{ role: "user", parts: gemini }],
      prompt.prompt
    );
    await sendGeminiMsg(event, chatText, prompt.prompt);
    if (!chatText || !chatText.text) return undefined;
    return chatText.text;
  }
  //如果没图就用deepseek
  const group = await groupModel.findOrAdd(event.group_id);
  const prompt = await aiModel.find(group.prompt);
  if (!prompt) {
    await noPrompt(event);
    return undefined;
  }
  const chatText = await deepSeekChat(
    [{ role: "user", content: deepseek }],
    prompt.name === "默认" ? undefined : prompt.prompt
  );
  await sendDeepseekMsg(event, chatText);
  if (!chatText) return undefined;
  return chatText;
}

async function noPrompt(event: GroupMessage) {
  return sendGroupMsg(event.group_id, [
    Structs.reply(event.message_id),
    Structs.text(`未配置Prompt，请联系系统管理员`),
  ]);
}

export { info };
