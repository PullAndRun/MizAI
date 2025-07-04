import {
  BaseEntity,
  Column,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from "typeorm";

@Entity()
@Index(["group_id", "member_id", "room_id"], { unique: true })
class Bili extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;
  //up主昵称
  @Column({ type: "text" })
  name: string;
  //群号
  @Column({ type: "float" })
  group_id: number;
  //up主uid
  @Column({ type: "float" })
  member_id: number;
  //直播间id
  @Column({ type: "float" })
  room_id: number;
  //开播时间,时间戳
  @Column({ type: "float", default: 0 })
  live_time: number;
  //粉丝数
  @Column({ type: "float", default: 0 })
  fans: number;
  //是否开播
  @Column({ type: "boolean", default: false })
  is_live: boolean;
}

function find(group_id: number, member_id: number, room_id: number) {
  return Bili.findOneBy({
    group_id,
    member_id,
    room_id,
  });
}

async function updateFans(
  group_id: number,
  member_id: number,
  room_id: number,
  fans: number
) {
  const bili = await find(group_id, member_id, room_id);
  if (!bili) return undefined;
  bili.fans = fans;
  await bili.save().catch((_) => undefined);
  return bili;
}

async function updateLiveStatus(
  group_id: number,
  member_id: number,
  room_id: number,
  is_live: boolean
) {
  const bili = await find(group_id, member_id, room_id);
  if (!bili) return undefined;
  bili.is_live = is_live;
  await bili.save().catch((_) => undefined);
  return bili;
}

async function add(
  name: string,
  group_id: number,
  member_id: number,
  room_id: number
) {
  const bili = new Bili();
  bili.name = name;
  bili.group_id = group_id;
  bili.member_id = member_id;
  bili.room_id = room_id;
  await bili.save().catch((_) => undefined);
  return bili;
}

async function findOrAdd(
  name: string,
  group_id: number,
  member_id: number,
  room_id: number
) {
  const bili = await find(group_id, member_id, room_id);
  if (!bili) {
    return add(name, group_id, member_id, room_id);
  }
  return bili;
}

async function remove(group_id: number, name: string) {
  const bili = await Bili.findOneBy({ group_id, name });
  if (!bili) return undefined;
  await bili.remove().catch((_) => undefined);
  return bili;
}

async function updateLiveTime(
  group_id: number,
  member_id: number,
  room_id: number,
  live_time: number
) {
  const bili = await find(group_id, member_id, room_id);
  if (!bili) return undefined;
  bili.live_time = live_time;
  await bili.save().catch((_) => undefined);
  return bili;
}

async function removeGroup(group_id: number) {
  const biliList = await Bili.find({ where: { group_id } });
  if (!biliList) return undefined;
  for (const bili of biliList) {
    await bili.remove();
  }
  return biliList;
}

async function findAll() {
  return Bili.find();
}

export {
  Bili,
  findAll,
  findOrAdd,
  remove,
  removeGroup,
  updateFans,
  updateLiveStatus,
  updateLiveTime,
};
