import { Entity, PrimaryColumn, Column, ManyToOne, ManyToMany, JoinTable } from 'typeorm';
import { Person } from './Person';
import { Tag } from './Tag';

@Entity()
export class Fragment {
  @PrimaryColumn('uuid')
  fragment_id!: string;

  @Column({ type: 'text' })
  title!: string;

  @Column({ type: 'int' })
  length!: number;

  @Column({ type: 'text' })
  player_url!: string;

  @Column({ type: 'text' })
  thumbnail_url!: string;

  @ManyToOne(() => Person, (person) => person.fragments, { onDelete: 'CASCADE' })
  person!: Person;

  @ManyToMany(() => Tag, (tag) => tag.fragments)
  @JoinTable()
  tags!: Tag[];
}
