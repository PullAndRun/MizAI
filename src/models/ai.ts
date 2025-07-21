import { BaseEntity, Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity()
class Ai extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;
  //prompt名称
  @Column({ type: "text", unique: true })
  name: string;
  //prompt
  @Column({ type: "text" })
  prompt: string;
}

async function Find(name: string) {
  return Ai.findOneBy({ name }).catch((_) => undefined);
}

async function Count() {
  return Ai.count().catch((_) => undefined);
}

async function Add(name: string, prompt: string) {
  const ai = new Ai();
  ai.name = name;
  ai.prompt = prompt;
  return ai.save().catch((_) => undefined);
}

async function Update(name: string, prompt: string) {
  const ai = await Find(name);
  if (!ai) {
    return Add(name, prompt);
  }
  ai.prompt = prompt;
  ai.save().catch((_) => undefined);
}

export { Add, Ai, Count, Find, Update };
