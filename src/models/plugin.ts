import {
  BaseEntity,
  Column,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from "typeorm";

@Entity()
@Index(["group_id", "name"], { unique: true })
class Plugin extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;
  //群号
  @Column({ type: "float" })
  group_id: number;
  //插件名称
  @Column({ type: "text" })
  name: string;
  //是否启用
  @Column({ type: "boolean", default: true })
  enable: boolean;
}

function find(group_id: number, name: string) {
  return Plugin.findOneBy({
    group_id,
    name,
  });
}

async function add(group_id: number, name: string, enable: boolean) {
  const plugin = new Plugin();
  plugin.group_id = group_id;
  plugin.name = name;
  plugin.enable = enable;
  await plugin.save().catch((_) => undefined);
  return plugin;
}

async function findOrAdd(
  group_id: number,
  name: string,
  enable: boolean = true
) {
  const plugin = await find(group_id, name);
  if (!plugin) {
    return add(group_id, name, enable);
  }
  return plugin;
}

async function update(group_id: number, name: string, enable: boolean) {
  const plugin = await find(group_id, name);
  if (!plugin) {
    return add(group_id, name, enable);
  }
  plugin.enable = enable;
  await plugin.save().catch((_) => undefined);
  return plugin;
}

async function findByGid(group_id: number) {
  return Plugin.findBy({ group_id });
}

export { findByGid, findOrAdd, Plugin, update };
