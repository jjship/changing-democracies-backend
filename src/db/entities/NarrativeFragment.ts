import { Entity, PrimaryGeneratedColumn, ManyToOne, Column, Index, Unique } from 'typeorm';
import { NarrativeEntity } from './Narrative';
import { FragmentEntity } from './Fragment';

@Entity()
@Index('idx_fragment_narrative', ['fragment', 'narrative'])
@Unique('UQ_narrative_sequence', ['narrative', 'sequence'])
export class NarrativeFragmentEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => NarrativeEntity, (narrative) => narrative.narrativeFragments, { onDelete: 'CASCADE' })
  narrative!: NarrativeEntity;

  @ManyToOne(() => FragmentEntity, (fragment) => fragment.narrativeFragments, { onDelete: 'CASCADE' })
  fragment!: FragmentEntity;

  @Column()
  sequence!: number;
}

// const newSequence = narrativeFragmentRepository
//   .createQueryBuilder('narrativeFragment')
//   .where('narrativeFragment.narrativeId = :narrativeId', { narrativeId })
//   .getCount(); // Automatically assigns the next available sequence
