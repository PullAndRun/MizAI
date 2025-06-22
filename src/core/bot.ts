import config from "@miz/ai/config/config.toml";
import { logger } from "@miz/ai/src/core/log";
import * as plugin from "@miz/ai/src/core/plugin";
import * as groupModel from "@miz/ai/src/models/group";
import * as pluginModel from "@miz/ai/src/models/plugin";
import {
  NCWebsocket,
  Structs,
  type GroupMessage,
  type SendMessageSegment,
} from "node-napcat-ts";

const clients: NCWebsocket[] = [];

async function connect() {
  const napcat = new NCWebsocket(
    {
      ...config.napcat,
      reconnection: {
        ...config.napcat.reconnection,
      },
    },
    config.napcat.debug
  );
  await napcat.connect().catch((_) => undefined);
  const status = await napcat.get_status().catch((_) => undefined);
  if (!status) {
    logger.error("连接不上napcat");
    return;
  }
  if (!status.online) {
    logger.error("qq不在线");
    return;
  }
  logger.info("登录成功");
  clients.push(napcat);
}

function getClient() {
  const client = clients[0];
  if (!client) {
    throw new Error("没有在线机器人");
  }
  return client;
}

async function sendGroupMsg(
  gid: number,
  message: (SendMessageSegment | undefined)[]
) {
  return getClient()
    .send_group_msg({
      group_id: gid,
      message: message.filter((v) => !!v),
    })
    .catch((e) => {
      logger.warn(
        `群消息发送失败\n->群号:${gid}\n->原因:\n${JSON.stringify(
          e
        )}\n->消息:\n${JSON.stringify(
          message.filter((v) => !!v && v.type === "text")
        )}`
      );
      return undefined;
    });
}

async function getGroupMsg(id: string) {
  return getClient()
    .get_msg({
      message_id: Number.parseFloat(id),
    })
    .catch((_) => undefined);
}

async function forwardGroupMsg(gid: number, messageId: number) {
  return getClient()
    .forward_group_single_msg({ group_id: gid, message_id: messageId })
    .catch((e) => {
      logger.warn(
        `群消息转发失败\n->群号:${gid}\n->原因:\n${JSON.stringify(
          e
        )}\n->消息id:\n${messageId}`
      );
      return undefined;
    });
}

function cmdText(msg: string, cmd: string[]) {
  return cmd.reduce(
    (acc, cur) =>
      acc
        .replace(new RegExp(`(^\\s*${cur}\\s*)`, "g"), "")
        .replace(new RegExp(`(\\[.+?\\])`, "g"), "")
        .replace(/(\r+)/g, "\r")
        .replace(/\s+/g, " ")
        .trim(),
    msg
  );
}

async function cmd(msg: string, event: GroupMessage, cmdList: commandList) {
  const roleHierarchy = ["member", "admin", "owner", "system"];
  const cmdParser: Record<string, string> = {
    system: "系统管理员",
    owner: "群主",
    admin: "群管理员",
    member: "任何人",
  };
  for (const cmd of cmdList) {
    if (!msg.startsWith(cmd.cmd)) continue;
    const groupMemberInfo = await getClient().get_group_member_info({
      group_id: event.group_id,
      user_id: event.sender.user_id,
    });
    if (
      roleHierarchy.indexOf(groupMemberInfo.role) <
        roleHierarchy.indexOf(cmd.role) &&
      event.sender.user_id !== config.bot.admin
    ) {
      await sendGroupMsg(event.group_id, [
        Structs.reply(event.message_id),
        Structs.text(
          `权限不足,无法执行命令\n您需要: ${cmdParser[cmd.role]}权限`
        ),
      ]);
      return;
    }
    await cmd.plugin(cmdText(msg, [cmd.cmd]), event);
    return;
  }
  const intro = cmdList
    .map(
      (cmd) =>
        `指令: ${cmd.cmd}\n说明: ${cmd.cmt}\n执行权限: ${cmdParser[cmd.role]}`
    )
    .join("\n\n");
  await sendGroupMsg(event.group_id, [
    Structs.reply(event.message_id),
    Structs.text(intro),
  ]);
}

async function listener() {
  getClient().on("message.group", async (event) => {
    const message = event.raw_message.replace(/\[.*?\]/g, "");
    if (!message.startsWith(config.bot.name)) {
      plugin.pick("复读=>无法调用")?.plugin(event);
      return;
    }
    const cmd = cmdText(message, [config.bot.name]);
    const pickedPlugin = plugin.pick(cmd);
    if (!pickedPlugin) {
      plugin.pick("聊天=>无法调用")?.plugin(event);
      return;
    }
    const lock = await pluginModel.findOrAdd(
      event.group_id,
      pickedPlugin.name,
      true
    );
    if (!lock.enable) {
      await sendGroupMsg(event.group_id, [
        Structs.reply(event.message_id),
        Structs.text(`错误: "${lock.name}" 功能未激活,请联系管理员激活`),
      ]);
      return;
    }
    pickedPlugin.plugin(event);
  });
  getClient().on("request.group.invite", async (event) => {
    await event.quick_action(true);
    await groupModel.active(event.group_id, true);
    logger.warn(`机器人加入了群 ${event.group_id}`);
  });
  getClient().on("notice.group_increase", async (event) => {
    const lock = await pluginModel.findOrAdd(event.group_id, "入群推送", true);
    if (!lock.enable) return;
    const loginInfo = await getClient().get_login_info();
    if (event.user_id === loginInfo.user_id) return;
    const member = await getClient().get_group_member_info({
      group_id: event.group_id,
      user_id: event.user_id,
    });
    const group = await getClient().get_group_info({
      group_id: event.group_id,
    });
    await sendGroupMsg(event.group_id, [
      Structs.text(`欢迎 ${member.nickname} 加入${group.group_name}`),
    ]);
  });
  getClient().on("notice.group_decrease.kick_me", async (event) => {
    await groupModel.active(event.group_id, false);
    logger.warn(`机器人被移出了群 ${event.group_id}`);
  });
  getClient().on("notice.group_decrease", async (event) => {
    if (config.bot.admin === event.user_id) {
      await getClient().set_group_leave({ group_id: event.group_id });
      await groupModel.active(event.group_id, false);
      return;
    }
    const lock = await pluginModel.findOrAdd(event.group_id, "退群推送", false);
    if (!lock.enable) return;
    const member = await getClient().get_stranger_info({
      user_id: event.user_id,
    });
    await sendGroupMsg(event.group_id, [
      Structs.text(
        `有成员退群\n昵称: ${member.nickname}\nID: ${event.user_id}\n原因: ${
          event.sub_type === "leave" ? "自己退群" : "管理员清退"
        }`
      ),
    ]);
  });
}

async function groupInit() {
  const groupList = await getClient().get_group_list();
  for (const group of groupList) {
    await groupModel.active(group.group_id, true);
  }
  const dbGroupList = await groupModel.findAll();
  const leaveGroupId = dbGroupList.filter(
    (dbg) => groupList.filter((g) => dbg.gid === g.group_id).length === 0
  );
  for (const group of leaveGroupId) {
    await groupModel.active(group.gid, false);
  }
}

async function init() {
  await connect();
  await groupInit();
  listener();
}

export {
  cmd,
  cmdText,
  forwardGroupMsg,
  getClient,
  getGroupMsg,
  init,
  sendGroupMsg,
};
