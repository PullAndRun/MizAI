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

async function Find(group_id: number, name: string) {
  return Plugin.findOneBy({
    group_id,
    name,
  }).catch((_) => undefined);
}

async function Add(group_id: number, name: string, enable: boolean = true) {
  const plugin = new Plugin();
  plugin.group_id = group_id;
  plugin.name = name;
  plugin.enable = enable;
  return plugin.save().catch((_) => undefined);
}

async function FindOrAdd(group_id: number, name: string, enable: boolean) {
  const plugin = await Find(group_id, name);
  if (!plugin) {
    return Add(group_id, name, enable);
  }
  return plugin;
}

async function Update(
  group_id: number,
  name: string,
  update: { enable?: boolean }
) {
  const plugin = await Find(group_id, name);
  if (!plugin) {
    return Add(group_id, name);
  }
  if (update.enable !== undefined) plugin.enable = update.enable;
  return plugin.save().catch((_) => undefined);
}

async function FindByGroupID(group_id: number) {
  return Plugin.findBy({ group_id }).catch((_) => undefined);
}

export { FindByGroupID, FindOrAdd, Plugin, Update };
