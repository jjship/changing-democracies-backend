import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, Index } from 'typeorm';
import { NarrativeEntity } from './Narrative';
import { CountryEntity } from './Country';
import { LanguageEntity } from './Language';

@Entity()
@Index('idx_description_narrative_language', ['narrative', 'language'])
export class DescriptionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => NarrativeEntity, (narrative) => narrative.descriptions, { onDelete: 'CASCADE' })
  narrative: NarrativeEntity;

  @ManyToOne(() => LanguageEntity, { onDelete: 'RESTRICT' })
  language: LanguageEntity;

  @Column({ type: 'simple-json' })
  description: string[];
}
