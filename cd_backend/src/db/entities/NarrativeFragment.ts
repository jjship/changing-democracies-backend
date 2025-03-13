import { Entity, PrimaryColumn, ManyToOne, Column, Index, Unique, JoinColumn, BeforeInsert } from 'typeorm';
import { NarrativeEntity } from './Narrative';
import { FragmentEntity } from './Fragment';
import { v4 as uuidv4 } from 'uuid';

@Entity('narrative_fragment')
@Index('idx_fragment_narrative', ['fragment', 'narrative'])
@Unique('UQ_narrative_sequence', ['narrative', 'sequence'])
export class NarrativeFragmentEntity {
  @PrimaryColumn('uuid')
  id: string;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = uuidv4();
    }
  }

  @ManyToOne(() => NarrativeEntity, (narrative) => narrative.narrativeFragments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'narrative_id' })
  narrative!: NarrativeEntity;

  @ManyToOne(() => FragmentEntity, (fragment) => fragment.narrativeFragments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'fragment_id' })
  fragment!: FragmentEntity;

  @Column({ name: 'sequence' })
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
