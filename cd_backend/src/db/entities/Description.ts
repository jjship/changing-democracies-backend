import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { NarrativeEntity } from './Narrative';
import { CountryEntity } from './Country';
import { LanguageEntity } from './Language';

@Entity()
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
