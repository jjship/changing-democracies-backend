import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, Index } from 'typeorm';
import { NarrativeEntity } from './Narrative';
import { LanguageEntity } from './Language';
import { CountryEntity } from './Country';
import { TagEntity } from './Tag';

@Entity()
@Index('idx_name_narrative_language', ['narrative', 'language'])
export class NameEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => NarrativeEntity, (narrative) => narrative.names, { onDelete: 'CASCADE' })
  narrative: NarrativeEntity;

  @ManyToOne(() => CountryEntity, (country) => country.names, { onDelete: 'CASCADE', nullable: true })
  country?: CountryEntity;

  @ManyToOne(() => LanguageEntity, { onDelete: 'RESTRICT' })
  language: LanguageEntity;

  @Column({ type: 'text' })
  name: string;

  @Column({ type: 'text' })
  type: 'Country' | 'Narrative' | 'Tag';

  @ManyToOne(() => TagEntity, (tag) => tag.names, { onDelete: 'CASCADE' })
  tag?: TagEntity;
}
