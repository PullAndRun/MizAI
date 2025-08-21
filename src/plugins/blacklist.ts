import Config from "@miz/ai/config/config.toml";
import { CommandText, Invoke, SendGroupMessage } from "@miz/ai/src/core/bot";
import * as BlackListModel from "@miz/ai/src/models/blacklist";
import { Structs, type GroupMessage } from "node-napcat-ts";

const info = {
  name: "ban",
  comment: [
    `使用 "ban add [qq号]" 命令屏蔽某用户`,
    `使用 "ban remove [qq号]" 命令取消屏蔽某用户`,
  ],
  Plugin,
};

async function Plugin(event: GroupMessage) {
  const commandText = CommandText(event.raw_message, [
    Config.Bot.name,
    info.name,
  ]);
  if (!commandText) {
    await SendGroupMessage(event.group_id, [
      Structs.reply(event.message_id),
      Structs.text(info.comment.join("\n")),
    ]);
    return;
  }
  const invokeParameterList: InvokeParameterList = [
    {
      command: "add",
      comment: `使用 "设置 人格" 命令查看如何变更AI人格`,
      role: "system",
      plugin: Add,
    },
    {
      command: "remove",
      comment: `使用 "设置 插件" 命令查看如何操作插件`,
      role: "system",
      plugin: Remove,
    },
  ];
  await Invoke(event, commandText, invokeParameterList);
}

async function Add(message: string, event: GroupMessage) {
  if (!message) {
    await SendGroupMessage(event.group_id, [
      Structs.reply(event.message_id),
      Structs.text(info.comment.join("\n")),
    ]);
    return;
  }
  await BlackListModel.Add(message);
  await SendGroupMessage(event.group_id, [
    Structs.reply(event.message_id),
    Structs.text(`屏蔽了用户: ${message}`),
  ]);
}
async function Remove(message: string, event: GroupMessage) {
  if (!message) {
    await SendGroupMessage(event.group_id, [
      Structs.reply(event.message_id),
      Structs.text(info.comment.join("\n")),
    ]);
    return;
  }
  await BlackListModel.Remove(message);
  await SendGroupMessage(event.group_id, [
    Structs.reply(event.message_id),
    Structs.text(`恢复了用户: ${message}`),
  ]);
}

export { info };
