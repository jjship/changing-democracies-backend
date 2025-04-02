import {
  Entity,
  PrimaryColumn,
  Column,
  ManyToOne,
  ManyToMany,
  JoinTable,
  OneToMany,
  Index,
  JoinColumn,
  BeforeInsert,
} from 'typeorm';
import { PersonEntity } from './Person';
import { TagEntity } from './Tag';
import { NarrativeFragmentEntity } from './NarrativeFragment';
import { NameEntity } from './Name';
import { v4 as uuidv4 } from 'uuid';

@Entity('fragment')
@Index('idx_fragment_title', ['title'])
export class FragmentEntity {
  @PrimaryColumn('uuid')
  id: string;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = uuidv4();
    }
  }

  @Column({ type: 'text' })
  title: string;

  @Column({ default: 0, name: 'duration_sec' })
  durationSec: number = 0;

  @Column({ type: 'text', name: 'player_url' })
  playerUrl: string;

  @Column({ type: 'text', name: 'thumbnail_url' })
  thumbnailUrl: string;

  @ManyToOne(() => PersonEntity, (person) => person.fragments, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({ name: 'person_id' })
  @Index('idx_fragment_person')
  person?: PersonEntity | null;

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
