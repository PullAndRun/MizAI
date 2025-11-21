import Config from "miz/config/config.toml";
import { Menu, Message, SendGroupMessage } from "miz/src/core/bot";
import * as AIModel from "miz/src/models/ai";
import * as GroupModel from "miz/src/models/group";
import * as PluginModel from "miz/src/models/plugin";
import { Structs, type GroupMessage } from "node-napcat-ts";

const info = {
  name: "设置",
  comment: [`使用 "设置 插件" 命令查看如何操作插件`],
  Plugin,
};

async function Plugin(event: GroupMessage) {
  const message = Message(event.message, [Config.Bot.name, info.name]);
  const menu: Menu = [
    {
      command: "人格",
      comment: `使用 "设置 人格" 命令查看如何变更AI人格`,
      role: "member",
      plugin: AI,
    },
    {
      command: "插件",
      comment: `使用 "设置 插件" 命令查看如何操作插件`,
      role: "member",
      plugin: Plugins,
    },
  ];
  await Menu(event, message, menu);
}

async function AI(message: string, event: GroupMessage) {
  const menu: Menu = [
    {
      command: "自定义",
      comment: `\n使用 "设置 人格 自定义 [人格内容]" 命令自定义AI人格。\n自定义AI人格需要以 "迷子是" 开头，AI人格限定200字以内。`,
      role: "member",
      plugin: CustomPrompt,
    },
    {
      command: "还原",
      comment: `使用 "设置 人格 还原" 命令查看如何还原默认人格`,
      role: "member",
      plugin: RestorePrompt,
    },
  ];
  await Menu(event, message, menu);
}

async function CustomPrompt(message: string, event: GroupMessage) {
  if (!message) {
    await SendGroupMessage(event.group_id, [
      Structs.reply(event.message_id),
      Structs.text(`请输入您想自定义的AI人格。`),
    ]);
    return;
  }
  if (message.length > 200) {
    await SendGroupMessage(event.group_id, [
      Structs.reply(event.message_id),
      Structs.text(
        `AI人格修改失败\n您输入的人格过长，请将人格限制在200字以内。\n您本次输入的人格为 ${message.length} 字。`
      ),
    ]);
    return;
  }
  const prompt = await AIModel.Find("自定义范本");
  if (!prompt) {
    await SendGroupMessage(event.group_id, [
      Structs.reply(event.message_id),
      Structs.text(`未发现系统预设的人格范本，请联系系统管理员。`),
    ]);
    return;
  }
  await AIModel.Update(event.group_id.toString(), message);
  await GroupModel.Update(event.group_id, {
    prompt_name: event.group_id.toString(),
  });
  await SendGroupMessage(event.group_id, [
    Structs.reply(event.message_id),
    Structs.text(
      `AI人格修改成功。人格已变更为:\n"${message}"\n如需还原初始人格，请执行 "设置 人格 还原" 命令`
    ),
  ]);
}

async function RestorePrompt(_: string, event: GroupMessage) {
  await GroupModel.Update(event.group_id, { prompt_name: "默认" });
  await SendGroupMessage(event.group_id, [
    Structs.reply(event.message_id),
    Structs.text(`AI人格已还原为初始人格`),
  ]);
}

async function Plugins(message: string, event: GroupMessage) {
  const menu: Menu = [
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
  await Menu(event, message, menu);
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
