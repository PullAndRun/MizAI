import Config from "@miz/ai/config/config.toml";
import { Logger } from "@miz/ai/src/core/log";
import { Pick } from "@miz/ai/src/core/plugin";
import * as GroupModel from "@miz/ai/src/models/group";
import * as PluginModel from "@miz/ai/src/models/plugin";
import {
  NCWebsocket,
  Structs,
  type GroupMessage,
  type SendMessageSegment,
} from "node-napcat-ts";

const clients: NCWebsocket[] = [];

async function Connect() {
  const ncWebSocket = new NCWebsocket({ ...Config.NCWebsocketOptions });
  await ncWebSocket.connect().catch((_) => undefined);
  const status = await ncWebSocket.get_status().catch((_) => undefined);
  if (!status) {
    Logger.error("连接不上napcat");
    return;
  }
  if (!status.online) {
    Logger.error("qq不在线");
    return;
  }
  Logger.info("登录成功");
  clients.push(ncWebSocket);
}

function Client() {
  const client = clients[0];
  if (!client) {
    throw new Error("没有在线机器人");
  }
  return client;
}

async function SendGroupMessage(
  groupID: number,
  message: SendMessageSegment[]
) {
  return Client()
    .send_group_msg({ group_id: groupID, message })
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

async function GetMessage(messageID: number) {
  return Client()
    .get_msg({ message_id: messageID })
    .catch((_) => undefined);
}

async function ForwardGroupMsg(groupID: number, messageID: number) {
  return Client()
    .forward_group_single_msg({ group_id: groupID, message_id: messageID })
    .catch((e) => {
      Logger.warn(
        `群消息转发失败\n->群号:${groupID}\n->原因:\n${JSON.stringify(
          e
        )}\n->消息id:\n${messageID}`
      );
      return undefined;
    });
}

//获取命令体，不要用来获取聊天正文。
function CommandText(message: string, commands: string[]) {
  const cleanedMessage = message
    //删除所有方括号内容
    .replace(/\[.*?\]/g, "")
    //合并所有回车符
    .replace(/(\r+)/g, "\r")
    //合并所有换行符
    .replace(/(\n+)/g, "\n")
    //合并所有空白字符
    .replace(/\s+/g, " ");
  return commands
    .reduce(
      (acc, cur) =>
        acc
          //删除以当前命令开头(含前后空格)的部分
          .replace(new RegExp(`(^\\s*${cur}\\s*)`, "g"), ""),
      cleanedMessage
    )
    .trim();
}

async function Invoke(
  event: GroupMessage,
  message: string,
  invokeParameterList: InvokeParameterList
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
      CommandText(message, [invokeParameter.command]),
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

async function Listener() {
  const loginInfo = await Client().get_login_info();
  Client().on("message.group", async (event) => {
    let messageList: string[] = [];
    let callBot = false;
    for (const eventMessage of event.message) {
      if (
        eventMessage.type === "at" &&
        eventMessage.data.qq === loginInfo.user_id.toString()
      ) {
        callBot = true;
      }
      if (eventMessage.type === "reply") {
        const groupMessage = await GetMessage(
          Number.parseFloat(eventMessage.data.id)
        );
        if (groupMessage && groupMessage.user_id === loginInfo.user_id) {
          callBot = true;
        }
      }
      if (eventMessage.type === "text") {
        const text = eventMessage.data.text.trim();
        if (
          text.startsWith(Config.Bot.name) ||
          text.includes(Config.Bot.nickname)
        ) {
          callBot = true;
        }
        messageList.push(CommandText(text, [Config.Bot.name]));
      }
    }
    if (event.sender.user_id === loginInfo.user_id) {
      callBot = false;
    }
    if (!callBot) {
      Pick("复读=>无法调用")?.plugin(event);
      return;
    }
    const message = messageList.filter((v) => !!v).join("");
    if (!message) return;
    const plugin = Pick(message);
    if (!plugin) {
      Pick("聊天=>无法调用")?.plugin(event);
      return;
    }
    const lock = await PluginModel.findOrAdd(event.group_id, plugin.name, true);
    if (!lock.enable) {
      await SendGroupMessage(event.group_id, [
        Structs.reply(event.message_id),
        Structs.text(`错误: "${lock.name}" 功能未激活,请联系管理员激活`),
      ]);
      return;
    }
    plugin.plugin(event);
  });
  Client().on("request.group.invite", async (event) => {
    await event.quick_action(true);
    await GroupModel.active(event.group_id, true);
    Logger.warn(`机器人加入了群 ${event.group_id}`);
  });
  Client().on("notice.group_increase", async (event) => {
    const lock = await PluginModel.findOrAdd(event.group_id, "入群推送", true);
    if (!lock.enable) return;
    if (event.user_id === loginInfo.user_id) return;
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
    await GroupModel.active(event.group_id, false);
    Logger.warn(`机器人被移出了群 ${event.group_id}`);
  });
  Client().on("notice.group_decrease", async (event) => {
    if (Config.Bot.admin === event.user_id) {
      await SendGroupMessage(event.group_id, [
        Structs.text(`监测到系统管理员退群。${Config.Bot.nickname} 跟随退群。`),
      ]);
      await Client().set_group_leave({ group_id: event.group_id });
      await GroupModel.active(event.group_id, false);
      return;
    }
    const lock = await PluginModel.findOrAdd(event.group_id, "退群推送", false);
    if (!lock.enable) return;
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
    await GroupModel.active(group.group_id, true);
  }
  const dbGroupList = await GroupModel.findAll();
  const leaveGroupList = dbGroupList.filter(
    (dbGroup) =>
      !!!qqGroupList.find((qqGroup) => dbGroup.group_id === qqGroup.group_id)
  );
  for (const leaveGroup of leaveGroupList) {
    await GroupModel.active(leaveGroup.group_id, false);
  }
}

async function Init() {
  await Connect();
  await GroupInit();
  await Listener();
}

export {
  Client,
  CommandText,
  ForwardGroupMsg,
  GetMessage,
  Init,
  Invoke,
  SendGroupMessage,
};
