import { BaseEntity, Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity()
class Group extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;
  //群号
  @Column({ type: "float", unique: true })
  group_id: number;
  //propmt名称
  @Column({ type: "text", default: "默认" })
  prompt_name: string;
  //是否在群里
  @Column({ type: "boolean", default: true })
  active: boolean;
}

async function Find(group_id: number) {
  return Group.findOneBy({
    group_id,
  }).catch((_) => undefined);
}

async function FindAll() {
  return Group.find().catch((_) => undefined);
}

async function Add(group_id: number) {
  const group = new Group();
  group.group_id = group_id;
  return group.save().catch((_) => undefined);
}

async function FindOrAdd(group_id: number) {
  const group = await Find(group_id);
  if (!group) {
    return Add(group_id);
  }
  return group;
}

async function Update(
  group_id: number,
  update: {
    prompt_name?: string;
    active?: boolean;
  }
) {
  const group = await FindOrAdd(group_id);
  if (!group) return undefined;
  if (update.prompt_name !== undefined) group.prompt_name = update.prompt_name;
  if (update.active !== undefined) group.active = update.active;
  return group.save().catch((_) => undefined);
}

export { Find, FindAll, FindOrAdd, Group, Update };
