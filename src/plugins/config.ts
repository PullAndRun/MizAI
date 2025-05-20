import { cmd, cmdText, message, sendGroupMsg } from "@miz/ai/src/core/bot";
import * as aiModel from "@miz/ai/src/models/ai";
import * as groupModel from "@miz/ai/src/models/group";
import * as pluginModel from "@miz/ai/src/models/plugin";
import config from "@tomato/bot/config.toml";
import { Structs } from "node-napcat-ts";

const info = {
  name: "设置",
  comment: [
    `使用 "设置 插件 启用 [插件名]" 命令启用插件`,
    `使用 "设置 插件 禁用 [插件名]" 命令禁用插件`,
    `使用 "设置 人格 [人格名]" 命令设置AI人格`,
    `使用 "设置 插件 状态" 命令查询所有插件状态`,
  ],
  plugin,
};

async function plugin(event: groupMessageEvent) {
  const msgEvent = await message(event.messageId);
  const msg = cmdText(msgEvent.raw_message, [config.bot.name, info.name]);
  const cmdList: commandList = [
    {
      cmd: "插件",
      cmt: `使用 "设置 插件" 命令查看如何操作插件`,
      role: "system",
      plugin: plugins,
    },
    {
      cmd: "人格",
      cmt: `使用 "设置 人格 [人格名]" 命令设置AI人格`,
      role: "system",
      plugin: prompts,
    },
  ];
  await cmd(msg, event, cmdList);
}

async function prompts(msg: string, event: groupMessageEvent) {
  const findPrompt = await aiModel.find(msg);
  if (!findPrompt) {
    await sendGroupMsg(event.groupId, [
      Structs.reply(event.messageId),
      Structs.text(`人格 ${msg} 切换失败\n没有 ${msg} 人格`),
    ]);
    return;
  }
  await groupModel.updatePrompt(event.groupId, msg).catch((_) => undefined);
  await sendGroupMsg(event.groupId, [
    Structs.reply(event.messageId),
    Structs.text(`人格 ${msg} 切换成功`),
  ]);
}

async function plugins(msg: string, event: groupMessageEvent) {
  const cmdList: commandList = [
    {
      cmd: "启用",
      cmt: `使用 "设置 插件 启用 [插件名称]" 命令启用插件`,
      role: "system",
      plugin: pluginEnable,
    },
    {
      cmd: "禁用",
      cmt: `使用 "设置 插件 禁用 [插件名称]" 命令禁用插件`,
      role: "system",
      plugin: pluginDisable,
    },
    {
      cmd: "状态",
      cmt: `使用 "设置 插件 状态" 命令查询所有插件状态`,
      role: "system",
      plugin: pluginState,
    },
  ];
  await cmd(msg, event, cmdList);
}

async function pluginEnable(msg: string, event: groupMessageEvent) {
  await pluginModel.update(event.groupId, msg, true).catch((_) => undefined);
  await sendGroupMsg(event.groupId, [
    Structs.reply(event.messageId),
    Structs.text(`插件 ${msg} 启用成功`),
  ]);
}

async function pluginDisable(msg: string, event: groupMessageEvent) {
  await pluginModel.update(event.groupId, msg, false).catch((_) => undefined);
  await sendGroupMsg(event.groupId, [
    Structs.reply(event.messageId),
    Structs.text(`插件 ${msg} 禁用成功`),
  ]);
}

async function pluginState(_: string, event: groupMessageEvent) {
  const plugins = await pluginModel.findByGid(event.groupId);
  const plugin = plugins
    .map((p) => `${p.name} ${p.enable ? "启用" : "禁用"}`)
    .join("\n");
  await sendGroupMsg(event.groupId, [
    Structs.reply(event.messageId),
    Structs.text(`插件状态: \n${plugin}`),
  ]);
}

export { info };
