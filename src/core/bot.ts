import config from "@miz/ai/config/config.toml";
import { logger } from "@miz/ai/src/core/log";
import { NCWebsocket, Structs, type SendMessageSegment } from "node-napcat-ts";

const clients: NCWebsocket[] = [];

async function connect() {
  const napcat = new NCWebsocket(
    {
      ...config.napcat,
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

async function sendGroupMsg(gid: number, message: SendMessageSegment[]) {
  return getClient()
    .send_group_msg({ group_id: gid, message: message })
    .catch((e) => {
      logger.warn(
        `群消息发送失败\n群号:${gid}\n\n原因:\n${JSON.stringify(
          e
        )}\n\n内容:\n${JSON.stringify(message)}`
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

async function cmd(
  msg: string,
  event: groupMessageEvent,
  cmdList: commandList
) {
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
      group_id: event.groupId,
      user_id: event.senderId,
    });
    if (
      roleHierarchy.indexOf(groupMemberInfo.role) <
        roleHierarchy.indexOf(cmd.role) &&
      event.senderId !== config.bot.admin
    ) {
      await sendGroupMsg(event.groupId, [
        Structs.reply(event.messageId),
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
  await sendGroupMsg(event.groupId, [
    Structs.reply(event.messageId),
    Structs.text(intro),
  ]);
}

function message(msgId: number) {
  return getClient().get_msg({
    message_id: msgId,
  });
}

async function listener() {
  getClient().on("message.group", async (event) => {
    const message = event.raw_message;
    if (!message.startsWith(config.bot.name)) {
    }
  });
}

async function init() {
  await connect();
}

export { cmd, cmdText, getClient, init, message, sendGroupMsg };
