import { Column, Entity, ManyToMany, PrimaryGeneratedColumn } from 'typeorm';
import { FragmentEntity } from './Fragment';

@Entity()
export class TagEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @ManyToMany(() => FragmentEntity, (fragment) => fragment.tags)
  fragments?: FragmentEntity[];
}
