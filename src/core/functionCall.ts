import {
  Type,
  type Content,
  type FunctionCall,
  type FunctionDeclaration,
} from "@google/genai";
import { Client, SendGroupMessage } from "@miz/ai/src/core/bot";
import { GeminiGroupContent } from "@miz/ai/src/plugins/chat";
import { Detail, HotComment, ID } from "@miz/ai/src/service/music";
import { Structs, type GroupMessage } from "node-napcat-ts";
import { z } from "zod";

function FunctionDeclarations() {
  const getMuisc: FunctionDeclaration = {
    name: "get_music",
    description:
      "解析用户请求并调用音乐搜索功能。返回音乐名称。音乐名称可能包含歌手名称。",
    parameters: {
      type: Type.OBJECT,
      properties: {
        music_name: {
          type: Type.STRING,
          description: "音乐名称。",
        },
      },
      required: ["music_name"],
    },
  };
  const getGroupChatHistory: FunctionDeclaration = {
    name: "require_chat_history",
    description:
      "判断是否需要读取群聊记录来回答当前问题，当问题涉及之前的讨论内容、需要上下文理解、或包含模糊指代时返回true",
    parameters: {
      type: Type.OBJECT,
      properties: {
        need_history: {
          type: Type.BOOLEAN,
          description: "当且仅当必须通过查看历史消息才能正确回答问题时为true",
        },
      },
      required: ["need_history"],
    },
  };
  return [getGroupChatHistory, getMuisc];
}

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
  const musicDetail = await Detail(id);
  if (!musicDetail) return undefined;
  return musicDetail.name;
}

export { ChatHistory, FunctionDeclarations, Music };
