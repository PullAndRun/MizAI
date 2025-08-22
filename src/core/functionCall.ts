import { Type, type Content, type FunctionDeclaration } from "@google/genai";
import { Client } from "@miz/ai/src/core/bot";
import { GeminiGroupContent } from "@miz/ai/src/plugins/chat";
import { type GroupMessage } from "node-napcat-ts";

function FunctionDeclarations() {
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
  return [getGroupChatHistory];
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
    historyContent.push(...geminiGroupContent);
  }
  return historyContent.filter((hc) => {
    for (const ct of newContent) {
      if (JSON.stringify(ct.parts) === JSON.stringify(hc.parts)) return false;
    }
    return true;
  });
}

export { ChatHistory, FunctionDeclarations };
