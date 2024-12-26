import { Column, Entity, ManyToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Fragment } from './Fragment';

@Entity()
export class Tag {
  @PrimaryGeneratedColumn('uuid')
  tag_id!: string;

  @Column({ unique: true })
  name!: string;

  @ManyToMany(() => Fragment, (fragment) => fragment.tags)
  fragments!: Fragment[];
}
