import { Entity, PrimaryGeneratedColumn, ManyToOne, Column } from 'typeorm';
import { NarrativeEntity } from './Narrative';
import { FragmentEntity } from './Fragment';

@Entity()
export class NarrativeFragmentEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => NarrativeEntity, (narrative) => narrative.narrativeFragments, { onDelete: 'CASCADE' })
  narrative!: NarrativeEntity;

  @ManyToOne(() => FragmentEntity, (fragment) => fragment.narrativeFragments, { onDelete: 'CASCADE' })
  fragment!: FragmentEntity;

  @Column()
  sequence!: number;
}
