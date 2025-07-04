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

function find(group_id: number) {
  return Group.findOneBy({
    group_id,
  });
}

function findAll() {
  return Group.find();
}

async function add(group_id: number) {
  const group = new Group();
  group.group_id = group_id;
  await group.save().catch((_) => undefined);
  return group;
}

async function findOrAdd(group_id: number) {
  const group = await find(group_id);
  if (!group) {
    return add(group_id);
  }
  return group;
}

async function updatePrompt(group_id: number, prompt_name: string) {
  const group = await findOrAdd(group_id);
  group.prompt_name = prompt_name;
  await group.save().catch((_) => undefined);
  return group;
}

async function active(group_id: number, active: boolean) {
  const group = await findOrAdd(group_id);
  group.active = active;
  await group.save().catch((_) => undefined);
  return group;
}

export { active, findAll, findOrAdd, Group, updatePrompt };
