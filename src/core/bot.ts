import config from "@miz/ai/config/config.toml";
import { NCWebsocket, type SendMessageSegment } from "node-napcat-ts";
import { logger } from "./log";

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
        `\n->群消息发送失败\n->群号:${gid}\n->原因:\n${JSON.stringify(
          e
        )}\n->内容:\n${JSON.stringify(message)}`
      );
      return undefined;
    });
}

async function init() {
  await connect();
}

export { getClient, init, sendGroupMsg };
