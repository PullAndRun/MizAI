import { BaseEntity, Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity()
class Blacklist extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;
  @Column({ type: "text", unique: true })
  user_id: string;
}

async function Find(user_id: string) {
  return Blacklist.findOneBy({
    user_id,
  }).catch((_) => undefined);
}

async function Add(user_id: string) {
  const blackList = new Blacklist();
  blackList.user_id = user_id;
  return blackList.save().catch((_) => undefined);
}

async function Remove(user_id: string) {
  const blackList = await Find(user_id);
  if (!blackList) return undefined;
  await blackList.remove().catch((_) => undefined);
}

export { Blacklist, Add, Find, Remove };
