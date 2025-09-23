import Config from "miz/config/config.toml";
import { Client, SendGroupMessage } from "miz/src/core/bot";
import { UrlToBuffer } from "miz/src/core/http";
import * as BiliModel from "miz/src/models/bili";
import * as GroupModel from "miz/src/models/group";
import * as PluginModel from "miz/src/models/plugin";
import {
  Card,
  Dynamic,
  DynamicReply,
  Live,
  LiveEndReply,
  LiveStartReply,
} from "miz/src/service/bili";
import { sleep } from "bun";
import dayjs from "dayjs";
import { Structs } from "node-napcat-ts";
import schedule from "node-schedule";

async function PushLiveNotifications() {
  const groups = await Client().get_group_list();
  const biliFindAll = await BiliModel.FindAll();
  if (!groups.length || !biliFindAll || !biliFindAll.length) return;
  const memberIDs = biliFindAll.map((v) => v.member_id);
  const live = await Live(memberIDs);
  if (!live) return;
  for (const group of groups) {
    const findGroup = await GroupModel.FindOrAdd(group.group_id);
    if (!findGroup || !findGroup.active) continue;
    const lock = await PluginModel.FindOrAdd(group.group_id, "直播推送", true);
    if (!lock || !lock.enable) continue;
    const vtubers = biliFindAll.filter((v) => v.group_id === group.group_id);
    if (!vtubers.length) continue;
    for (const vtuber of vtubers) {
      const user = live[vtuber.member_id];
      if (!user) continue;
      if (user.live_status !== 1 && vtuber.is_live) {
        const card = await Card(vtuber.member_id);
        const fansChange = () => {
          if (!card || !vtuber.fans) return 0;
          return card.fans - vtuber.fans;
        };
        const liveEndReply = await LiveEndReply({
          coverFromUser: user.cover_from_user,
          name: user.uname,
          title: user.title,
          startTime: vtuber.live_time,
          fans: fansChange(),
        });
        await SendGroupMessage(group.group_id, [
          liveEndReply.cover && Structs.image(liveEndReply.cover),
          Structs.text(liveEndReply.text),
        ]);
        await BiliModel.Update(
          vtuber.group_id,
          vtuber.member_id,
          vtuber.room_id,
          {
            is_live: false,
            live_time: 0,
          }
        );
        continue;
      }
      if (
        user.live_status !== 1 ||
        user.live_time === 0 ||
        dayjs().diff(dayjs(user.live_time * 1000), "minute") >=
          Config.Bili.live.delay
      )
        continue;
      const liveStartReply = await LiveStartReply({
        coverFromUser: user.cover_from_user,
        title: user.title,
        name: user.uname,
        liveTime: user.live_time,
        roomID: user.room_id,
      });
      await SendGroupMessage(group.group_id, [
        liveStartReply.cover && Structs.image(liveStartReply.cover),
        Structs.text(liveStartReply.text),
      ]);
      const card = await Card(vtuber.member_id);
      const fans = () => {
        if (!card) return 0;
        return card.fans;
      };
      await BiliModel.Update(
        vtuber.group_id,
        vtuber.member_id,
        vtuber.room_id,
        {
          fans: fans(),
          is_live: true,
          live_time: user.live_time,
        }
      );
    }
  }
}

async function PushDynamicNotifications() {
  const groups = await Client().get_group_list();
  const biliFindAll = await BiliModel.FindAll();
  if (!groups.length || !biliFindAll || !biliFindAll.length) return;
  for (const group of groups) {
    const findGroup = await GroupModel.FindOrAdd(group.group_id);
    if (!findGroup || !findGroup.active) continue;
    const lock = await PluginModel.FindOrAdd(group.group_id, "动态推送", true);
    if (!lock || !lock.enable) continue;
    const vtubers = biliFindAll.filter((v) => v.group_id === group.group_id);
    if (!vtubers.length) continue;
    for (const vtuber of vtubers) {
      const dynamic = await Dynamic(vtuber.member_id);
      if (!dynamic) continue;
      if (
        dayjs().diff(dayjs(dynamic.pubDate), "minute") >=
        Config.Bili.dynamic.delay
      )
        continue;
      const dynamicReply = DynamicReply(dynamic);
      const imageBuffer = await UrlToBuffer(dynamic.image);
      await SendGroupMessage(group.group_id, [
        imageBuffer && Structs.image(imageBuffer),
        Structs.text(dynamicReply.text),
      ]);
      await sleep(Config.Bot.message_delay * 1000);
    }
  }
}

function Task() {
  schedule.scheduleJob(Config.Bili.live.spec, PushLiveNotifications);
  schedule.scheduleJob(Config.Bili.dynamic.spec, PushDynamicNotifications);
}

export { Task };
