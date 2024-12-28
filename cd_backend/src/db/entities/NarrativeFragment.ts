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

// async function recomputeNarrativeSequence(narrativeId: string) {
//   const narrativeFragments = await narrativeFragmentRepository.find({
//     where: { narrative: { id: narrativeId } },
//     order: { sequence: 'ASC' },
//   });

//   for (let i = 0; i < narrativeFragments.length; i++) {
//     narrativeFragments[i].sequence = i; // Recompute sequence
//   }

//   await narrativeFragmentRepository.save(narrativeFragments);
// }
