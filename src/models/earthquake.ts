import {
  BaseEntity,
  Column,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from "typeorm";

@Entity()
@Index(["title", "description", "link", "pub_date"], { unique: true })
class Earthquake extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;
  @Column({ type: "text" })
  title: string;
  @Column({ type: "text" })
  description: string;
  @Column({ type: "text" })
  link: string;
  @Column({ type: "text" })
  pub_date: string;
}

async function Find(description: string) {
  return Earthquake.findOneBy({
    description,
  }).catch((_) => undefined);
}

async function Count() {
  return Earthquake.count().catch((_) => undefined);
}

async function Add(
  title: string,
  description: string,
  link: string,
  pub_date: string
) {
  const earthquake = new Earthquake();
  earthquake.title = title;
  earthquake.description = description;
  earthquake.link = link;
  earthquake.pub_date = pub_date;
  return earthquake.save().catch((_) => undefined);
}

export { Add, Count, Earthquake, Find };
