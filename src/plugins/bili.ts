import Config from "miz/config/config.toml";
import { Menu, Message, SendGroupMessage } from "miz/src/core/bot";
import { UrlToBuffer } from "miz/src/core/http";
import * as BiliModel from "miz/src/models/bili";
import {
  Card,
  Dynamic,
  DynamicReply,
  Live,
  LiveStartReply,
  User,
} from "miz/src/service/bili";
import { Structs, type GroupMessage } from "node-napcat-ts";

const info = {
  name: "主播",
  comment: [
    `使用 "主播 关注 [主播昵称]" 命令关注主播`,
    `使用 "主播 取关 [主播昵称]" 命令取关主播`,
    `使用 "主播 直播 [主播昵称]" 命令查询主播直播动态`,
    `使用 "主播 动态 [主播昵称]" 命令查询主播个人动态`,
    `使用 "主播 列表" 命令展示已关注主播列表`,
  ],
  Plugin,
};

async function Plugin(event: GroupMessage) {
  const message = Message(event.message, [Config.Bot.name, info.name]);
  const menu: Menu = [
    {
      command: "关注",
      comment: `使用 "主播 关注 [主播昵称]" 命令关注主播`,
      role: "admin",
      plugin: Follow,
    },
    {
      command: "取关",
      comment: `使用 "主播 取关 [主播昵称]" 命令取关主播`,
      role: "admin",
      plugin: Unfollow,
    },
    {
      command: "直播",
      comment: `使用 "主播 直播 [主播昵称]" 命令查询主播直播动态`,
      role: "member",
      plugin: Lives,
    },
    {
      command: "动态",
      comment: `使用 "主播 动态 [主播昵称]" 命令查询主播个人动态`,
      role: "member",
      plugin: Dynamics,
    },
    {
      command: "列表",
      comment: `使用 "主播 列表" 命令展示已关注主播列表`,
      role: "member",
      plugin: List,
    },
  ];
  await Menu(event, message, menu);
}

async function Dynamics(uname: string, event: GroupMessage) {
  if (!uname) {
    await SendGroupMessage(event.group_id, [
      Structs.reply(event.message_id),
      Structs.text(
        `查询失败，缺少主播昵称。\n请使用 "主播 动态 [主播昵称]" 命令查询主播个人动态。`
      ),
    ]);
    return;
  }
  const user = await User(uname);
  if (!user || user.uname !== uname) {
    await SendGroupMessage(event.group_id, [
      Structs.reply(event.message_id),
      Structs.text(`查询失败，主播昵称不正确。\n请检查主播昵称。`),
    ]);
    return;
  }
  const dynamic = await Dynamic(user.mid);
  if (!dynamic) {
    await SendGroupMessage(event.group_id, [
      Structs.reply(event.message_id),
      Structs.text(`"${uname}" 暂无动态。`),
    ]);
    return;
  }
  const dynamicReply = DynamicReply(dynamic);
  const dynamicImage = await UrlToBuffer(dynamic.image);
  await SendGroupMessage(event.group_id, [
    dynamicImage && Structs.image(dynamicImage),
    Structs.text(dynamicReply.text),
  ]);
}

async function Follow(uname: string, event: GroupMessage) {
  if (!uname) {
    await SendGroupMessage(event.group_id, [
      Structs.reply(event.message_id),
      Structs.text(
        `关注失败，缺少主播昵称。\n请使用 "主播 关注 [主播昵称]" 命令关注主播。`
      ),
    ]);
    return;
  }
  const user = await User(uname);
  if (!user || user.uname !== uname) {
    await SendGroupMessage(event.group_id, [
      Structs.reply(event.message_id),
      Structs.text(`关注失败，主播昵称不正确。\n请检查主播昵称。`),
    ]);
    return;
  }
  await BiliModel.FindOrAdd(user.uname, event.group_id, user.mid, user.room_id);
  const card = await Card(user.mid);
  if (card) {
    await BiliModel.Update(event.group_id, user.mid, user.room_id, {
      fans: card.fans,
    });
  }
  await SendGroupMessage(event.group_id, [
    Structs.reply(event.message_id),
    Structs.text(`关注成功，已为您关注 "${uname}"`),
  ]);
}

async function Unfollow(uname: string, event: GroupMessage) {
  if (!uname) {
    await SendGroupMessage(event.group_id, [
      Structs.reply(event.message_id),
      Structs.text(
        `取关失败，主播昵称不正确。\n请使用 "主播 取关 [主播昵称]" 命令取关主播。`
      ),
    ]);
    return;
  }
  const removeUploader = await BiliModel.RemoveUploader(event.group_id, uname);
  if (!removeUploader) {
    await SendGroupMessage(event.group_id, [
      Structs.reply(event.message_id),
      Structs.text(`取关失败，尚未关注 "${uname}"`),
    ]);
    return;
  }
  await SendGroupMessage(event.group_id, [
    Structs.reply(event.message_id),
    Structs.text(`取关成功，已取关主播 "${uname}"`),
  ]);
}

async function List(_: string, event: GroupMessage) {
  const followList = await BiliModel.FindAll();
  if (!followList || followList.length === 0) {
    await SendGroupMessage(event.group_id, [
      Structs.reply(event.message_id),
      Structs.text(`本群尚未关注主播。`),
    ]);
    return;
  }
  await SendGroupMessage(event.group_id, [
    Structs.reply(event.message_id),
    Structs.text(
      `本群已关注:\n${followList
        .filter((v) => v.group_id === event.group_id)
        .map((v) => v.name)
        .join("\n")}`
    ),
  ]);
}

async function Lives(uname: string, event: GroupMessage) {
  if (!uname) {
    await SendGroupMessage(event.group_id, [
      Structs.reply(event.message_id),
      Structs.text(
        `查询失败，缺少主播昵称。\n使用 "主播 直播 [主播昵称]" 命令查询主播直播动态。`
      ),
    ]);
    return;
  }
  const user = await User(uname);
  if (!user || user.uname !== uname) {
    await SendGroupMessage(event.group_id, [
      Structs.reply(event.message_id),
      Structs.text(`查询失败，主播昵称不正确。\n请检查主播昵称。`),
    ]);
    return;
  }
  const live = await Live([user.mid]);
  if (!live) {
    await SendGroupMessage(event.group_id, [
      Structs.reply(event.message_id),
      Structs.text(`您查询的主播未开通直播间。`),
    ]);
    return;
  }
  const liveData = live[user.mid];
  if (!liveData) {
    await SendGroupMessage(event.group_id, [
      Structs.reply(event.message_id),
      Structs.text(`您查询的主播未开通直播间。`),
    ]);
    return;
  }
  const liveStartReply = await LiveStartReply({
    coverFromUser: liveData.cover_from_user,
    title: liveData.title,
    name: liveData.uname,
    liveTime: liveData.live_time,
    roomID: liveData.room_id,
  });
  await SendGroupMessage(event.group_id, [
    Structs.reply(event.message_id),
    liveStartReply.cover && Structs.image(liveStartReply.cover),
    Structs.text(liveStartReply.text),
  ]);
}

export { info };
