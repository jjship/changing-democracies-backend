import {
  Entity,
  PrimaryColumn,
  Column,
  ManyToOne,
  ManyToMany,
  JoinTable,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PersonEntity } from './Person';
import { TagEntity } from './Tag';
import { NarrativeFragmentEntity } from './NarrativeFragment';
import { NameEntity } from './Name';

@Entity()
export class FragmentEntity {
  @PrimaryColumn('uuid')
  id: string;

  @CreateDateColumn({ type: 'datetime' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updatedAt: Date;

  @Column({ type: 'text' })
  title: string;

  @Column({ default: 0 })
  durationSec: number = 0;

  @Column({ type: 'text' })
  playerUrl: string;

  @Column({ type: 'text' })
  thumbnailUrl: string;

  @ManyToOne(() => PersonEntity, (person) => person.fragments, { onDelete: 'RESTRICT' })
  person?: PersonEntity;

  @ManyToMany(() => TagEntity, (tag) => tag.fragments)
  @JoinTable({
    name: 'fragment_tags',
    joinColumn: {
      name: 'fragment_id',
      referencedColumnName: 'id',
    },
    inverseJoinColumn: {
      name: 'tag_id',
      referencedColumnName: 'id',
    },
  })
  tags?: TagEntity[];

  @OneToMany(() => NarrativeFragmentEntity, (narrativeFragment) => narrativeFragment.fragment)
  narrativeFragments?: NarrativeFragmentEntity[];
}
