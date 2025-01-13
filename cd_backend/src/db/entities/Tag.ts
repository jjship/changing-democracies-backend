import { Column, Entity, ManyToMany, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { FragmentEntity } from './Fragment';
import { NameEntity } from './Name';

@Entity()
export class TagEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToMany(() => NameEntity, (name) => name.tag, { cascade: true })
  names?: NameEntity[];

  @ManyToMany(() => FragmentEntity, (fragment) => fragment.tags)
  fragments?: FragmentEntity[];
}
