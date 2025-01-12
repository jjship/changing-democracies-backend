import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { NarrativeEntity } from './Narrative';
import { LanguageEntity } from './Language';
import { CountryEntity } from './Country';
import { TagEntity } from './Tag';

@Entity()
export class NameEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => LanguageEntity, { onDelete: 'RESTRICT' })
  language: LanguageEntity;

  @Column({ type: 'text' })
  name: string;

  @Column({ type: 'text' })
  type: 'Country' | 'Narrative' | 'Tag';

  @ManyToOne(() => CountryEntity, (country) => country.names)
  country?: CountryEntity;

  @ManyToOne(() => NarrativeEntity, (narrative) => narrative.names)
  narrative?: NarrativeEntity;

  @ManyToOne(() => TagEntity, (tag) => tag.names)
  tag?: TagEntity;
}
