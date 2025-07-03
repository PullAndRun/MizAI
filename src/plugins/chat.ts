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
import { aiMessage, urlToOpenAIImages } from "@miz/ai/src/core/util";
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

enum replyStatus {
  no_reply = "no_reply",
  no_prompt = "no_prompt",
  success = "success",
}

async function plugin(event: GroupMessage) {
  const msg = cmdText(event.raw_message, [config.bot.name]);
  if (!msg) return;
  if (event.raw_message.includes(config.bot.nick_name)) {
    const context = await sendContext(event, groupChat);
    if (context === replyStatus.success) return;
  } else {
    const context = await sendContext(event, singleChat);
    if (context === replyStatus.success) return;
  }
  await sendGroupMsg(event.group_id, [
    Structs.reply(event.message_id),
    Structs.text("机器人cpu过热\n请稍候重试。"),
  ]);
}

async function sendContext(
  event: GroupMessage,
  context: (e: GroupMessage) => Promise<replyStatus>
) {
  for (let retry = 0; retry < config.gemini.retry; retry++) {
    const message = await context(event);
    if (message === replyStatus.success) return replyStatus.success;
    await sleep(config.gemini.sleep * 1000);
  }
  return replyStatus.no_reply;
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
      const image = await urlToOpenAIImages(message.data.url);
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
  if (!prompt) return replyStatus.no_prompt;
  const chatText = await geminiChat(
    [{ role: "user", parts: part }],
    prompt.prompt
  );
  return await sendGeminiMsg(event, chatText, prompt.prompt);
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
    const image = await urlToOpenAIImages(message.data.url);
    if (image) {
      gemini.push({ inlineData: image });
    }
  }
  return {
    deepseek,
    gemini,
  };
}

async function sendFunctionCall(
  event: GroupMessage,
  chat: GenerateContentResponse,
  prompt?: string
) {
  if (!chat || !chat.text) return replyStatus.no_reply;
  if (chat.functionCalls && chat.functionCalls.length) {
    for (const functionCall of chat.functionCalls) {
      if (functionCall.name === "get_image") {
        let { imageName } = <{ imageName: string }>functionCall.args;
        if (!imageName) continue;
        const image = await baiduSearch(imageName);
        if (!image) {
          await sendGroupMsg(event.group_id, [
            Structs.reply(event.message_id),
            Structs.text(`没有找到 ${imageName} 的图片`),
          ]);
          continue;
        }
        const functionCallReply = await retryGeminiChat(
          [
            {
              role: "user",
              parts: [{ text: event.raw_message }],
            },
            {
              role: "model",
              parts: [{ text: aiMessage(chat.text) }],
            },
            {
              role: "user",
              parts: [
                {
                  functionResponse: {
                    name: functionCall.name,
                    response: { result: { imageName: imageName.toString() } },
                  },
                },
              ],
            },
          ],
          prompt
        );
        if (functionCallReply !== replyStatus.no_reply) {
          await sendGroupMsg(event.group_id, [
            Structs.reply(event.message_id),
            Structs.image(image),
            Structs.text(functionCallReply),
          ]);
        }
      }
    }
  }
  return replyStatus.success;
}

async function sendGeminiMsg(
  event: GroupMessage,
  chat: GenerateContentResponse | undefined,
  prompt?: string
) {
  if (!chat || !chat.text || !chat.candidates) return replyStatus.no_reply;
  for (const candidates of chat.candidates) {
    if (!candidates.content || !candidates.content.parts) continue;
    for (const parts of candidates.content.parts) {
      const text = parts.text;
      if (!text) continue;
      await sendGroupMsg(event.group_id, [
        Structs.reply(event.message_id),
        Structs.text(aiMessage(text)),
      ]);
      await sleep(config.bot.sleep * 1000);
    }
  }
  const functionCallReply = await sendFunctionCall(event, chat, prompt);
  if (functionCallReply !== replyStatus.success) return replyStatus.no_reply;
  return replyStatus.success;
}

async function retryGeminiChat(context: ContentListUnion, prompt?: string) {
  for (let retry = 0; retry < config.gemini.retry; retry++) {
    const resp = await geminiChat(context, prompt);
    if (resp && resp.text) return resp.text;
    await sleep(config.bot.sleep * 1000);
  }
  return replyStatus.no_reply;
}

async function sendDeepSeekMsg(
  event: GroupMessage,
  chatText: string | null | undefined
) {
  if (!chatText) return replyStatus.no_reply;
  await sendGroupMsg(event.group_id, [
    Structs.reply(event.message_id),
    Structs.text(aiMessage(chatText)),
  ]);
  return replyStatus.success;
}

async function singleChat(event: GroupMessage) {
  const deepseek: ChatCompletionContentPartText[] = [];
  const gemini: Part[] = [];
  for (const eventMessage of event.message) {
    if (eventMessage.type === "reply") {
      const replyMessage = await getGroupMsg(eventMessage.data.id);
      if (!replyMessage) continue;
      for (const message of replyMessage.message) {
        const receive = await singleChatContent(message);
        deepseek.push(...receive.deepseek);
        gemini.push(...receive.gemini);
      }
      continue;
    }
    const receive = await singleChatContent(eventMessage);
    deepseek.push(...receive.deepseek);
    gemini.push(...receive.gemini);
  }
  //如果有图就用gemini
  if (deepseek.length !== gemini.length) {
    const prompt = await aiModel.find("gemini");
    if (!prompt) return replyStatus.no_prompt;
    const chatText = await geminiChat(
      [{ role: "user", parts: gemini }],
      prompt.prompt
    );
    return await sendGeminiMsg(event, chatText, prompt.prompt);
  }
  //如果没图就用deepseek
  const group = await groupModel.findOrAdd(event.group_id);
  const findPrompt = await aiModel.find(group.prompt);
  if (!findPrompt) return replyStatus.no_prompt;
  const prompt = () => {
    if (findPrompt.name === "默认") return undefined;
    return findPrompt.prompt;
  };
  const chatText = await deepSeekChat(
    [{ role: "user", content: deepseek }],
    prompt()
  );
  return await sendDeepSeekMsg(event, chatText);
}

export { info };
