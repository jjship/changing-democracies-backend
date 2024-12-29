import { Column, Entity, PrimaryGeneratedColumn, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { NarrativeFragmentEntity } from './NarrativeFragment';

@Entity()
export class NarrativeEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @Column({ type: 'text' })
  title: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ default: 0 })
  total_duration_sec: number;

  @OneToMany(() => NarrativeFragmentEntity, (narrativeFragment) => narrativeFragment.narrative)
  narrativeFragments?: NarrativeFragmentEntity[];
}
