import config from "@miz/ai/config/config.toml";
import { cmd, cmdText, sendGroupMsg } from "@miz/ai/src/core/bot";
import * as biliModel from "@miz/ai/src/models/bili";
import {
  dynamicMsg,
  fetchDynamic,
  fetchLive,
  fetchUser,
  liveMsg,
} from "@miz/ai/src/service/bili";
import { Structs, type GroupMessage } from "node-napcat-ts";

const info = {
  name: "主播",
  comment: [
    `使用 "主播 关注 [主播昵称]" 命令关注主播`,
    `使用 "主播 取关 [主播昵称]" 命令取关主播`,
    `使用 "主播 查询 [主播昵称]" 命令查询主播直播动态`,
    `使用 "主播 列表" 命令展示已关注主播列表`,
  ],
  plugin,
};

async function plugin(event: GroupMessage) {
  const msg = cmdText(event.raw_message, [config.bot.name, info.name]);
  const cmdList: commandList = [
    {
      cmd: "关注",
      cmt: `使用 "主播 关注 [主播昵称]" 命令关注主播`,
      role: "admin",
      plugin: follow,
    },
    {
      cmd: "取关",
      cmt: `使用 "主播 取关 [主播昵称]" 命令取关主播`,
      role: "admin",
      plugin: unfollow,
    },
    {
      cmd: "查询",
      cmt: `使用 "主播 查询 [主播昵称]" 命令查询主播直播讯息`,
      role: "member",
      plugin: query,
    },
    {
      cmd: "列表",
      cmt: `使用 "主播 列表" 命令展示已关注主播列表`,
      role: "member",
      plugin: list,
    },
    {
      cmd: "动态",
      cmt: `使用 "主播 动态" 命令展示已关注主播的动态`,
      role: "member",
      plugin: dynamic,
    },
  ];
  await cmd(msg, event, cmdList);
}

async function dynamic(uname: string, event: GroupMessage) {
  if (!uname) {
    await sendGroupMsg(event.group_id, [
      Structs.reply(event.message_id),
      Structs.text(
        `缺少主播昵称\n请使用 "主播 动态 [主播昵称]" 命令展示已关注主播的动态。`
      ),
    ]);
    return;
  }
  const user = await fetchUser(uname);
  if (!user || user.uname !== uname) {
    await sendGroupMsg(event.group_id, [
      Structs.reply(event.message_id),
      Structs.text(`没找到您想看动态的主播\n请检查主播昵称。`),
    ]);
    return;
  }
  const dynamic = await fetchDynamic(user.mid);
  if (!dynamic) return;
  const msg = dynamicMsg(dynamic);
  await sendGroupMsg(event.group_id, [Structs.text(msg.text)]);
}

async function follow(uname: string, event: GroupMessage) {
  if (!uname) {
    await sendGroupMsg(event.group_id, [
      Structs.reply(event.message_id),
      Structs.text(
        `关注失败,缺少主播昵称\n请使用 "主播 关注 [主播昵称]" 命令关注主播。`
      ),
    ]);
    return;
  }
  const user = await fetchUser(uname);
  if (!user || user.uname !== uname) {
    await sendGroupMsg(event.group_id, [
      Structs.reply(event.message_id),
      Structs.text(`关注失败,没找到您想关注的主播\n请检查主播昵称。`),
    ]);
    return;
  }
  await biliModel.findOrAdd(user.uname, event.group_id, user.mid, user.room_id);
  await sendGroupMsg(event.group_id, [
    Structs.reply(event.message_id),
    Structs.text(`关注成功\n已为您关注主播 "${uname}"`),
  ]);
}

async function unfollow(uname: string, event: GroupMessage) {
  if (!uname) {
    await sendGroupMsg(event.group_id, [
      Structs.reply(event.message_id),
      Structs.text(
        `取关失败,缺少主播昵称\n请使用 "主播 取关 [主播昵称]" 命令取关主播。`
      ),
    ]);
    return;
  }
  await biliModel.remove(event.group_id, uname);
  await sendGroupMsg(event.group_id, [
    Structs.reply(event.message_id),
    Structs.text(`取关成功\n已为您取关主播 "${uname}"`),
  ]);
}

async function list(_: string, event: GroupMessage) {
  const followList = await biliModel.findAll();
  if (followList.length === 0) {
    await sendGroupMsg(event.group_id, [
      Structs.reply(event.message_id),
      Structs.text(`本群尚未关注任何主播。`),
    ]);
    return;
  }
  await sendGroupMsg(event.group_id, [
    Structs.reply(event.message_id),
    Structs.text(
      `本群已关注:\n${followList
        .filter((v) => v.gid === event.group_id)
        .map((v) => v.name)
        .join("\n")}`
    ),
  ]);
}

async function query(uname: string, event: GroupMessage) {
  if (!uname) {
    await sendGroupMsg(event.group_id, [
      Structs.reply(event.message_id),
      Structs.text(
        `查询失败,缺少主播昵称\n请使用 "主播 查询 [主播昵称]" 命令查询主播。`
      ),
    ]);
    return;
  }
  const user = await fetchUser(uname);
  if (!user || user.uname !== uname) {
    await sendGroupMsg(event.group_id, [
      Structs.reply(event.message_id),
      Structs.text(`查询失败,没找到您想查询的主播,请检查主播昵称。`),
    ]);
    return;
  }
  const live = await fetchLive([user.mid]);
  if (!live) {
    await sendGroupMsg(event.group_id, [
      Structs.reply(event.message_id),
      Structs.text(`您查询的主播没有开通直播间。`),
    ]);
    return;
  }
  const liveData = live[user.mid];
  if (!liveData || liveData.live_status === 0) {
    await sendGroupMsg(event.group_id, [
      Structs.reply(event.message_id),
      Structs.text(`您查询的主播没开播。`),
    ]);
    return;
  }
  const msg = liveMsg(liveData);
  await sendGroupMsg(event.group_id, [
    Structs.reply(event.message_id),
    Structs.image(msg.cover),
    Structs.text(msg.text),
  ]);
}

export { info };
