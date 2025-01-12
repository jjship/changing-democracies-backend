import { Column, Entity, PrimaryGeneratedColumn, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { NarrativeFragmentEntity } from './NarrativeFragment';
import { DescriptionEntity } from './Description';
import { NameEntity } from './Name';

@Entity()
export class NarrativeEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn({ type: 'datetime' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updatedAt: Date;

  @OneToMany(() => NameEntity, (name) => name.narrative, { cascade: true })
  names?: NameEntity[];

  @Column({ default: 0 })
  totalDurationSec: number;

  @OneToMany(() => NarrativeFragmentEntity, (narrativeFragment) => narrativeFragment.narrative)
  narrativeFragments?: NarrativeFragmentEntity[];

  @OneToMany(() => DescriptionEntity, (description) => description.narrative, { cascade: true })
  descriptions?: DescriptionEntity[];
}
