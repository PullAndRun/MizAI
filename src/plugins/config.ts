import Config from "@miz/ai/config/config.toml";
import { CommandText, Invoke, SendGroupMessage } from "@miz/ai/src/core/bot";
import * as PluginModel from "@miz/ai/src/models/plugin";
import { Structs, type GroupMessage } from "node-napcat-ts";

const info = {
  name: "设置",
  comment: [`使用 "设置 插件" 命令查看如何操作插件`],
  Plugin,
};

async function Plugin(event: GroupMessage) {
  const commandText = CommandText(event.raw_message, [
    Config.Bot.name,
    info.name,
  ]);
  const invokeParameterList: InvokeParameterList = [
    {
      command: "插件",
      comment: `使用 "设置 插件" 命令查看如何操作插件`,
      role: "member",
      plugin: Plugins,
    },
  ];
  await Invoke(event, commandText, invokeParameterList);
}

async function Plugins(message: string, event: GroupMessage) {
  const invokeParameterList: InvokeParameterList = [
    {
      command: "启用",
      comment: `使用 "设置 插件 启用 [插件名称]" 命令启用插件`,
      role: "system",
      plugin: PluginEnable,
    },
    {
      command: "禁用",
      comment: `使用 "设置 插件 禁用 [插件名称]" 命令禁用插件`,
      role: "system",
      plugin: PluginDisable,
    },
    {
      command: "状态",
      comment: `使用 "设置 插件 状态" 命令查询所有插件状态`,
      role: "member",
      plugin: PluginState,
    },
  ];
  await Invoke(event, message, invokeParameterList);
}

async function PluginEnable(plugin: string, event: GroupMessage) {
  await PluginModel.Update(event.group_id, plugin, { enable: true });
  await SendGroupMessage(event.group_id, [
    Structs.reply(event.message_id),
    Structs.text(`插件 ${plugin} 启用成功`),
  ]);
}

async function PluginDisable(plugin: string, event: GroupMessage) {
  await PluginModel.Update(event.group_id, plugin, { enable: false });
  await SendGroupMessage(event.group_id, [
    Structs.reply(event.message_id),
    Structs.text(`插件 ${plugin} 禁用成功`),
  ]);
}

async function PluginState(_: string, event: GroupMessage) {
  const findPlugins = await PluginModel.FindByGroupID(event.group_id);
  if (!findPlugins) {
    await SendGroupMessage(event.group_id, [
      Structs.reply(event.message_id),
      Structs.text(`未查询到群内插件信息。`),
    ]);
    return;
  }
  const plugin = findPlugins
    .map((p) => `${p.name} ${p.enable ? "启用" : "禁用"}`)
    .join("\n");
  await SendGroupMessage(event.group_id, [
    Structs.reply(event.message_id),
    Structs.text(`插件状态\n${plugin}`),
  ]);
}

export { info };
