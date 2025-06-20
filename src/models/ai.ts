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

function find(name: string) {
  return Ai.findOneBy({ name });
}

function count() {
  return Ai.count();
}

async function add(name: string, prompt: string) {
  const ai = new Ai();
  ai.name = name;
  ai.prompt = prompt;
  await ai.save().catch((_) => undefined);
  return ai;
}

export { add, Ai, count, find };
