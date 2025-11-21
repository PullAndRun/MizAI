import Config from "miz/config/config.toml";
import { Logger } from "miz/src/core/log";
import { Pick } from "miz/src/core/plugin";
import * as BlackListModel from "miz/src/models/blacklist";
import * as GroupModel from "miz/src/models/group";
import * as PluginModel from "miz/src/models/plugin";
import {
  NCWebsocket,
  Structs,
  type GroupMessage,
  type NodeSegment,
  type Receive,
  type SendMessageSegment,
} from "node-napcat-ts";

const clients: NCWebsocket[] = [];
const loginInfo: Array<{
  user_id: number;
  nickname: string;
}> = [];

async function Connect() {
  const ncWebSocket = new NCWebsocket({ ...Config.NCWebsocketOptions });
  await ncWebSocket.connect().catch((_) => undefined);
  const status = await ncWebSocket.get_status().catch((_) => undefined);
  if (!status) throw new Error("连接不上napcat");
  if (!status.online) throw new Error("qq不在线");
  clients.push(ncWebSocket);
  loginInfo.push(await ncWebSocket.get_login_info());
  Logger.info("登录成功");
}

function Client() {
  const client = clients[0];
  if (!client) {
    throw new Error("没有在线机器人");
  }
  return client;
}

function LoginInfo() {
  const info = loginInfo[0];
  if (!info) {
    throw new Error("在线机器人没有登录信息");
  }
  return info;
}

async function Sendable(groupID: number) {
  const { group_all_shut } = await Client().get_group_info({
    group_id: groupID,
  });
  if (group_all_shut !== -1) return true;
  const login_info = await Client().get_login_info();
  const group_member_info = await Client().get_group_member_info({
    group_id: groupID,
    user_id: login_info.user_id,
  });
  return group_member_info.role === "admin";
}

async function SendGroupMessage(
  groupID: number,
  message: (SendMessageSegment | undefined)[]
) {
  const sendable = await Sendable(groupID);
  if (!sendable) return;
  return Client()
    .send_group_msg({ group_id: groupID, message: message.filter((v) => !!v) })
    .catch((e) => {
      Logger.warn(
        `群消息发送失败\n->群号:${groupID}\n->原因:\n${JSON.stringify(
          e
        )}\n->消息:\n${JSON.stringify(
          message.filter((v) => !!v && v.type === "text")
        )}`
      );
      return undefined;
    });
}

async function SendForwardMessage(groupID: number, messageID: number) {
  const sendable = await Sendable(groupID);
  if (!sendable) return null;
  return Client()
    .forward_group_single_msg({ group_id: groupID, message_id: messageID })
    .catch((e) => {
      Logger.warn(
        `群消息转发失败\n->群号:${groupID}\n->原因:\n${JSON.stringify(
          e
        )}\n->消息id:\n${messageID}`
      );
      return null;
    });
}

async function SendSegmentMessage(
  groupID: number,
  contents: Array<Array<SendMessageSegment>>
) {
  const sendable = await Sendable(groupID);
  if (!sendable) return;
  const nodeSegment: NodeSegment[] = [];
  for (const content of contents) {
    nodeSegment.push(Structs.customNode(content));
  }
  if (!nodeSegment.length) return;
  await SendGroupMessage(groupID, nodeSegment);
}

async function GetMessage(messageID: number) {
  return Client()
    .get_msg({ message_id: messageID })
    .catch((_) => undefined);
}

function Message(
  messages: Array<Receive[keyof Receive]>,
  commands: Array<string> = []
) {
  const message = messages
    .map((v) => {
      if (v.type === "text") return v.data.text.trim();
      return undefined;
    })
    .filter((v) => !!v)
    .join("\n")
    .replace(/(\r+)/g, "\r")
    .replace(/(\n+)/g, "\n")
    .replace(/\s+/g, " ");
  return commands
    .reduce(
      (acc, cur) => acc.replace(new RegExp(`(^\\s*${cur}\\s*)`, "g"), ""),
      message
    )
    .trim();
}

async function Menu(
  event: GroupMessage,
  message: string,
  invokeParameterList: Menu
) {
  const roleHierarchy = ["member", "admin", "owner", "system"];
  const permissionMapping: Record<string, string> = {
    system: "系统管理员",
    owner: "群主",
    admin: "群管理员",
    member: "任何人",
  };
  for (const invokeParameter of invokeParameterList) {
    if (!message.startsWith(invokeParameter.command)) continue;
    const groupMemberInfo = await Client().get_group_member_info({
      group_id: event.group_id,
      user_id: event.sender.user_id,
    });
    if (
      roleHierarchy.indexOf(groupMemberInfo.role) <
        roleHierarchy.indexOf(invokeParameter.role) &&
      event.sender.user_id !== Config.Bot.admin
    ) {
      await SendGroupMessage(event.group_id, [
        Structs.reply(event.message_id),
        Structs.text(
          `权限不足,无法执行命令\n您需要: ${
            permissionMapping[invokeParameter.role]
          }权限`
        ),
      ]);
      return;
    }
    await invokeParameter.plugin(
      Message(event.message, [invokeParameter.command]),
      event
    );
    return;
  }
  const invokePatameterExplain = invokeParameterList
    .map(
      (invokeParameter) =>
        `指令: ${invokeParameter.command}\n说明: ${
          invokeParameter.comment
        }\n执行权限: ${permissionMapping[invokeParameter.role]}`
    )
    .join("\n\n");
  await SendGroupMessage(event.group_id, [
    Structs.reply(event.message_id),
    Structs.text(invokePatameterExplain),
  ]);
}

async function Event() {
  Client().on("message.group", async (event) => {
    if (event.sender.user_id === LoginInfo().user_id) return;
    const message = Message(event.message, [Config.Bot.name]);
    if (!message) return;
    const isCallBot = async () => {
      for (const eventMessage of event.message) {
        if (
          eventMessage.type === "at" &&
          eventMessage.data.qq === LoginInfo().user_id.toString()
        )
          return true;
        if (eventMessage.type === "reply") {
          const groupMessage = await GetMessage(
            Number.parseFloat(eventMessage.data.id)
          );
          if (groupMessage && groupMessage.user_id === LoginInfo().user_id)
            return true;
        }
        if (eventMessage.type === "text") {
          const text = eventMessage.data.text.trim();
          if (
            text.startsWith(Config.Bot.name) ||
            text.includes(Config.Bot.nickname)
          )
            return true;
        }
      }
      return false;
    };
    const call = await isCallBot();
    if (!call) {
      Pick("复读=>无法调用")?.Plugin(event);
      return;
    }
    const isBanUser = await BlackListModel.Find(event.user_id.toString());
    if (isBanUser) return;
    const plugin = Pick(message);
    if (!plugin) {
      if (!message.includes(Config.Bot.nickname)) {
        await SendGroupMessage(event.group_id, [
          Structs.reply(event.message_id),
          Structs.text(
            `您输入的命令有误。\n如需帮助，请输入 "${Config.Bot.name}帮助" 。\n如需使用AI，请在聊天内容包含 "${Config.Bot.nickname}" 关键字。`
          ),
        ]);
        return;
      }
      Pick("聊天=>无法调用")?.Plugin(event);
      return;
    }
    const pluginState = await PluginModel.FindOrAdd(
      event.group_id,
      plugin.name,
      true
    );
    if (pluginState && !pluginState.enable) {
      await SendGroupMessage(event.group_id, [
        Structs.reply(event.message_id),
        Structs.text(`错误: "${pluginState.name}" 功能未激活,请联系管理员激活`),
      ]);
      return;
    }
    plugin.Plugin(event);
  });
  Client().on("request.group.invite", async (event) => {
    await event.quick_action(true);
    await GroupModel.Update(event.group_id, { active: true });
    Logger.warn(`机器人加入了群 ${event.group_id}`);
  });
  Client().on("notice.group_increase", async (event) => {
    const lock = await PluginModel.FindOrAdd(event.group_id, "入群推送", true);
    if (!lock || !lock.enable || event.user_id === LoginInfo().user_id) return;
    const member = await Client().get_group_member_info({
      group_id: event.group_id,
      user_id: event.user_id,
    });
    const group = await Client().get_group_info({
      group_id: event.group_id,
    });
    await SendGroupMessage(event.group_id, [
      Structs.text(`欢迎 ${member.nickname} 加入${group.group_name}`),
    ]);
  });
  Client().on("notice.group_decrease.kick_me", async (event) => {
    await GroupModel.Update(event.group_id, { active: false });
    Logger.warn(`机器人被移出了群 ${event.group_id}`);
  });
  Client().on("notice.group_decrease", async (event) => {
    if (Config.Bot.admin === event.user_id) {
      await SendGroupMessage(event.group_id, [
        Structs.text(`监测到系统管理员离开群聊。`),
      ]);
      await Client().set_group_leave({ group_id: event.group_id });
      await GroupModel.Update(event.group_id, { active: false });
      return;
    }
    const lock = await PluginModel.FindOrAdd(event.group_id, "退群推送", false);
    if (!lock || !lock.enable) return;
    const strangerInfo = await Client().get_stranger_info({
      user_id: event.user_id,
    });
    await SendGroupMessage(event.group_id, [
      Structs.text(
        `有成员退群\n昵称: ${strangerInfo.nickname}\nID: ${
          event.user_id
        }\n原因: ${event.sub_type === "leave" ? "自己退群" : "管理员清退"}`
      ),
    ]);
  });
}

async function GroupInit() {
  const qqGroupList = await Client().get_group_list();
  for (const group of qqGroupList) {
    await GroupModel.Update(group.group_id, { active: true });
  }
  const dbGroupList = await GroupModel.FindAll();
  if (!dbGroupList) return;
  const leaveGroupList = dbGroupList.filter(
    (dbGroup) =>
      !!!qqGroupList.find((qqGroup) => dbGroup.group_id === qqGroup.group_id)
  );
  for (const leaveGroup of leaveGroupList) {
    await GroupModel.Update(leaveGroup.group_id, { active: false });
  }
}

async function Init() {
  await Connect();
  await GroupInit();
  await Event();
}

export {
  Client,
  GetMessage,
  Init,
  LoginInfo,
  Menu,
  Message,
  SendForwardMessage,
  SendGroupMessage,
  SendSegmentMessage,
};
