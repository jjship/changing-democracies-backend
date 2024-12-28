import { Column, Entity, PrimaryGeneratedColumn, OneToMany, AfterInsert, AfterUpdate, AfterRemove } from 'typeorm';
import { NarrativeFragmentEntity } from './NarrativeFragment';

@Entity()
export class NarrativeEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  title: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ default: 0 })
  total_duration_sec: number;

  @OneToMany(() => NarrativeFragmentEntity, (narrativeFragment) => narrativeFragment.narrative)
  narrativeFragments?: NarrativeFragmentEntity[];
}
