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

@Entity()
export class FragmentEntity {
  @PrimaryColumn('uuid')
  id: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @Column({ type: 'text' })
  title: string;

  @Column({ default: 0 })
  duration_sec: number = 0;

  @Column({ type: 'text' })
  player_url: string;

  @Column({ type: 'text' })
  thumbnail_url: string;

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
