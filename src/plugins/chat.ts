import Config from "@miz/ai/config/config.toml";
import { CommandText, SendGroupMessage } from "@miz/ai/src/core/bot";
import { AIMessage } from "@miz/ai/src/core/util";
import { Deepseek } from "@miz/ai/src/service/ai";
import { Structs, type GroupMessage } from "node-napcat-ts";
import type OpenAI from "openai";

const info = {
  name: "聊天=>无法调用",
  comment: [`内置AI聊天功能`],
  Plugin,
};

async function Plugin(event: GroupMessage) {
  const commandText = CommandText(event.raw_message, []);
  if (commandText.startsWith(Config.Bot.name)) {
    await DeepseekChat(event);
    return;
  }
  if (commandText.includes(Config.Bot.nickname)) {
    await SendGroupMessage(event.group_id, [
      Structs.reply(event.message_id),
      Structs.text(`迷子AI维护中，敬请期待。\n如需使用普通AI，请用bot+问题。`),
    ]);
    return;
  }
}

async function DeepseekChat(event: GroupMessage) {
  const chatCompletionMessageParams: OpenAI.Chat.Completions.ChatCompletionMessageParam[] =
    [];
  for (const message of event.message) {
    if (message.type === "text") {
      chatCompletionMessageParams.push({
        role: "user",
        content: [{ type: "text", text: message.data.text }],
      });
    }
  }
  const deepseek = await Deepseek(chatCompletionMessageParams);
  if (!deepseek) {
    await SendGroupMessage(event.group_id, [
      Structs.reply(event.message_id),
      Structs.text(`机器人cpu过热\n请稍候重试。`),
    ]);
    return;
  }
  for (const message of deepseek.choices) {
    const content = message.message.content;
    if (!content) continue;
    await SendGroupMessage(event.group_id, [
      Structs.reply(event.message_id),
      Structs.text(AIMessage(content)),
    ]);
  }
}

export { info };
