import { Column, Entity, PrimaryColumn, OneToMany, BeforeInsert, CreateDateColumn, Index } from 'typeorm';
import { NarrativeFragmentEntity } from './NarrativeFragment';
import { DescriptionEntity } from './Description';
import { NameEntity } from './Name';
import { v4 as uuidv4 } from 'uuid';

@Entity('narrative')
export class NarrativeEntity {
  @PrimaryColumn('uuid')
  id: string;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = uuidv4();
    }
  }

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  @Index('idx_narrative_created_at')
  createdAt: Date;

  @OneToMany(() => NameEntity, (name) => name.narrative, { cascade: true })
  names?: NameEntity[];

  @Column({ default: 0, name: 'total_duration_sec' })
  totalDurationSec: number;

  @OneToMany(() => NarrativeFragmentEntity, (narrativeFragment) => narrativeFragment.narrative)
  narrativeFragments?: NarrativeFragmentEntity[];

  @OneToMany(() => DescriptionEntity, (description) => description.narrative, { cascade: true })
  descriptions?: DescriptionEntity[];
}
