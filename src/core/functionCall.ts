import { type Content, type FunctionCall } from "@google/genai";
import { Client, SendGroupMessage } from "@miz/ai/src/core/bot";
import { GeminiGroupContent } from "@miz/ai/src/plugins/chat";
import { HotComment, ID } from "@miz/ai/src/service/music";
import { Structs, type GroupMessage } from "node-napcat-ts";
import { z } from "zod";

async function ChatHistory(
  event: GroupMessage,
  newContent: Content[],
  count: number
) {
  const historyContent: Content[] = [];
  if (count === 0) return [];
  const groupMessageHistory = await Client().get_group_msg_history({
    group_id: event.group_id,
    count,
  });
  for (const messages of groupMessageHistory.messages) {
    const geminiGroupContent = await GeminiGroupContent(messages);
    if (!geminiGroupContent) continue;
    historyContent.push(geminiGroupContent);
  }
  return historyContent.filter((hc) => {
    for (const ct of newContent) {
      if (JSON.stringify(ct.parts) === JSON.stringify(hc.parts)) return false;
    }
    return true;
  });
}

async function Music(event: GroupMessage, functionCall: FunctionCall) {
  const musicSchema = z.object({
    args: z.object({
      music_name: z.string(),
    }),
  });
  const music = musicSchema.safeParse(functionCall);
  if (!music.success) return undefined;
  const musicName = music.data.args.music_name;
  const id = await ID(musicName);
  if (!id) return undefined;
  const message = await SendGroupMessage(event.group_id, [
    Structs.music("163", id),
  ]);
  if (!message) return musicName;
  const hotComment = await HotComment(id);
  if (!hotComment) return musicName;
  await SendGroupMessage(event.group_id, [
    Structs.reply(message.message_id),
    Structs.text(hotComment),
  ]);
  return musicName;
}

export { ChatHistory, Music };
