import {
  BaseEntity,
  Column,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from "typeorm";

@Entity()
@Index(["title", "description", "link", "pubDate"], { unique: true })
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
  pubDate: string;
}

function find(
  title: string,
  description: string,
  link: string,
  pubDate: string
) {
  return Earthquake.findOneBy({
    title,
    description,
    link,
    pubDate,
  });
}

function count() {
  return Earthquake.count();
}

async function add(
  title: string,
  description: string,
  link: string,
  pubDate: string
) {
  const earthquake = new Earthquake();
  earthquake.title = title;
  earthquake.description = description;
  earthquake.link = link;
  earthquake.pubDate = pubDate;
  await earthquake.save().catch((_) => undefined);
  return earthquake;
}

export { add, count, Earthquake, find };
