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

export { Ai, find };
