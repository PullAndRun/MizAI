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

async function Find(group_id: number, member_id: number, room_id: number) {
  return Bili.findOneBy({
    group_id,
    member_id,
    room_id,
  }).catch((_) => undefined);
}

async function Update(
  group_id: number,
  member_id: number,
  room_id: number,
  update: {
    name?: string;
    live_time?: number;
    fans?: number;
    is_live?: boolean;
  }
) {
  const bili = await Find(group_id, member_id, room_id);
  if (!bili) return undefined;
  if (update.name !== undefined) bili.name = update.name;
  if (update.live_time !== undefined) bili.live_time = update.live_time;
  if (update.fans !== undefined) bili.fans = update.fans;
  if (update.is_live !== undefined) bili.is_live = update.is_live;
  return bili.save().catch((_) => undefined);
}

async function Add(
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
  return bili.save().catch((_) => undefined);
}

async function FindOrAdd(
  name: string,
  group_id: number,
  member_id: number,
  room_id: number
) {
  const bili = await Find(group_id, member_id, room_id);
  if (!bili) {
    return Add(name, group_id, member_id, room_id);
  }
  return bili;
}

async function RemoveUploader(group_id: number, name: string) {
  const bili = await Bili.findOneBy({ group_id, name }).catch((_) => undefined);
  if (!bili) return undefined;
  return bili.remove().catch((_) => undefined);
}

async function RemoveGroup(group_id: number) {
  const biliList = await Bili.find({ where: { group_id } }).catch(
    (_) => undefined
  );
  if (!biliList) return undefined;
  const removeList = [];
  for (const bili of biliList) {
    const removeGroup = await bili.remove().catch((_) => undefined);
    removeList.push(removeGroup);
  }
  return removeList.filter((v) => !!v);
}

async function FindAll() {
  return Bili.find().catch((_) => undefined);
}

export { Bili, FindAll, FindOrAdd, RemoveGroup, RemoveUploader, Update };
