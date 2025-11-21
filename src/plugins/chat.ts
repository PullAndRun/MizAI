// import {
//   FunctionCallingConfigMode,
//   Type,
//   type Content,
//   type FunctionDeclaration,
//   type Part,
// } from "@google/genai";
// import Config from "miz/config/config.toml";
// import { Client, GetMessage, SendGroupMessage } from "miz/src/core/bot";
// import { UrlToBlob_2 } from "miz/src/core/http";
// import { AIReply, GroupPrompt, SplitStringByLength } from "miz/src/core/util";
// import { Gemini } from "miz/src/service/ai";
// import { Structs, type GroupMessage, type Receive } from "node-napcat-ts";
// const info = {
//   name: "聊天=>无法调用",
//   comment: [`内置AI聊天功能`],
//   Plugin,
// };

// async function Plugin(event: GroupMessage) {
//   await GeminiChat(event);
// }

// async function GeminiChat(event: GroupMessage) {
//   const content: Content[] = [];
//   const geminiContent = await GeminiContent(event);
//   if (!geminiContent) return;
//   content.push(...geminiContent);
//   const groupPrompt = await GroupPrompt(event.group_id);
//   if (!groupPrompt) {
//     await SendGroupMessage(event.group_id, [
//       Structs.reply(event.message_id),
//       Structs.text(`系统未录入迷子AI人格，请联系管理员。`),
//     ]);
//     return;
//   }
//   const chatHistory = await ChatHistory(event, content, Config.AI.nearChat);
//   content.unshift(...chatHistory);
//   await GeminiFunctionCall(event, content, groupPrompt);
//   for (let retry = 0; retry < Config.AI.retry; retry++) {
//     const gemini = await Gemini(content, groupPrompt, {
//       tools: [{ googleSearch: {} }],
//     });
//     if (
//       !gemini ||
//       !gemini.candidates ||
//       !gemini.candidates.length ||
//       !gemini.text
//     )
//       continue;
//     for (const candidate of gemini.candidates) {
//       if (!candidate.content || !candidate.content.parts) continue;
//       for (const part of candidate.content.parts) {
//         if (!part.text || !AIReply(part.text)) continue;
//         const msgs = SplitStringByLength(part.text, 4000);
//         for (const msg of msgs) {
//           await SendGroupMessage(event.group_id, [
//             Structs.reply(event.message_id),
//             Structs.text(AIReply(msg)),
//           ]);
//         }
//       }
//     }
//     break;
//   }
// }

// async function GeminiContent(event: {
//   message: Receive[keyof Receive][];
//   message_id: number;
//   sender: { card: string; nickname: string };
// }) {
//   const parts: Part[] = [];
//   let replyTo: number | undefined = undefined;
//   const content: Array<{ role: string; parts: Part[] }> = [];
//   for (const message of event.message) {
//     if (message.type === "text") {
//       parts.push({ text: message.data.text });
//     }
//     if (message.type === "image") {
//       const urlToBlob_2 = await UrlToBlob_2(message.data.url);
//       if (!urlToBlob_2) {
//         parts.push({ text: `暂不支持的图片类型。` });
//         continue;
//       }
//       parts.push({ inlineData: urlToBlob_2 });
//     }
//     if (message.type === "forward") {
//       for (const content of message.data.content || []) {
//         if (content.type === "text") {
//           parts.push({ text: content.data.text });
//         }
//         if (content.type === "image") {
//           const urlToBlob_2 = await UrlToBlob_2(content.data.url);
//           if (!urlToBlob_2) {
//             parts.push({ text: `暂不支持的图片类型。` });
//             continue;
//           }
//           parts.push({ inlineData: urlToBlob_2 });
//         }
//       }
//     }
//     if (message.type === "reply") {
//       const getMessage = await GetMessage(Number.parseFloat(message.data.id));
//       if (!getMessage) continue;
//       const replyParts = await GeminiContent(event);
//       if (!replyParts) continue;
//       content.push(...replyParts);
//       replyTo = getMessage.message_id;
//     }
//   }
//   if (!parts.length) return undefined;
//   content.push({
//     role: "user",
//     parts: [
//       {
//         text: `${[
//           `<metadata>`,
//           `This is a group message`,
//           `MessageID : "${event.message_id}"`,
//           replyTo && `Quoting to MessageID: "${replyTo}"`,
//           `Sender's name: "${
//             event.sender.card || event.sender.nickname || "无名氏"
//           }"`,
//           `</metadata>`,
//         ].join("\n")}`,
//       },
//       ...parts,
//     ],
//   });
//   return content;
// }

// async function GeminiFunctionCall(
//   event: GroupMessage,
//   content: Content[],
//   prompt: string
// ) {
//   for (let retry = 0; retry < Config.AI.retry; retry++) {
//     const gemini = await Gemini(
//       content,
//       prompt,
//       {
//         tools: [{ functionDeclarations: FunctionDeclarations() }],
//         toolConfig: {
//           functionCallingConfig: { mode: FunctionCallingConfigMode.ANY },
//         },
//         thinkingConfig: { thinkingBudget: 0 },
//         temperature: 0,
//         maxOutputTokens: 500,
//       },
//       "gemini-2.5-flash-lite"
//     );
//     if (!gemini || !gemini.candidates) continue;
//     if (!gemini.functionCalls || !gemini.functionCalls.length) break;
//     for (const candidate of gemini.candidates) {
//       if (!candidate.content || !candidate.content.parts) continue;
//       content.push(candidate.content);
//     }
//     const partList: Part[] = [];
//     for (const functionCall of gemini.functionCalls) {
//       if (functionCall.name === "require_chat_history") {
//         const chatHistory = await ChatHistory(
//           event,
//           content,
//           Config.AI.history
//         );
//         content.unshift(...chatHistory);
//         partList.push({
//           functionResponse: {
//             name: functionCall.name,
//             response: functionCall.args,
//           },
//         });
//       }
//     }
//     if (partList.length) {
//       content.push({
//         role: "user",
//         parts: partList,
//       });
//     }
//     break;
//   }
// }

// function FunctionDeclarations() {
//   const getGroupChatHistory: FunctionDeclaration = {
//     name: "require_chat_history",
//     description:
//       "判断是否需要读取群聊记录来回答当前问题，当问题涉及之前的讨论内容、需要上下文理解、或包含模糊指代时返回true",
//     parameters: {
//       type: Type.OBJECT,
//       properties: {
//         need_history: {
//           type: Type.BOOLEAN,
//           description: "当且仅当必须通过查看历史消息才能正确回答问题时为true",
//         },
//       },
//       required: ["need_history"],
//     },
//   };
//   return [getGroupChatHistory];
// }

// async function ChatHistory(
//   event: GroupMessage,
//   newContent: Content[],
//   count: number
// ) {
//   const historyContent: Content[] = [];
//   if (count === 0) return [];
//   const groupMessageHistory = await Client().get_group_msg_history({
//     group_id: event.group_id,
//     count,
//   });
//   for (const messages of groupMessageHistory.messages) {
//     const geminiGroupContent = await GeminiContent(messages);
//     if (!geminiGroupContent) continue;
//     historyContent.push(...geminiGroupContent);
//   }
//   return historyContent.filter((hc) => {
//     for (const ct of newContent) {
//       if (JSON.stringify(ct.parts) === JSON.stringify(hc.parts)) return false;
//     }
//     return true;
//   });
// }

// export { GeminiGroupContent, info };
