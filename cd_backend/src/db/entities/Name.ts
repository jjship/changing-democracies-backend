import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn, BeforeInsert } from 'typeorm';
import { NarrativeEntity } from './Narrative';
import { LanguageEntity } from './Language';
import { CountryEntity } from './Country';
import { TagEntity } from './Tag';
import { v4 as uuidv4 } from 'uuid';

@Entity('name')
export class NameEntity {
  @PrimaryColumn('uuid')
  id: string;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = uuidv4();
    }
  }

  @Column({ type: 'text' })
  name: string;

  @Column({ type: 'text' })
  type: string;

  @ManyToOne(() => LanguageEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'language_id' })
  language: LanguageEntity;

  @ManyToOne(() => CountryEntity, (country) => country.names, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'country_id' })
  country?: CountryEntity;

  @ManyToOne(() => NarrativeEntity, (narrative) => narrative.names, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'narrative_id' })
  narrative?: NarrativeEntity;

  @ManyToOne(() => TagEntity, (tag) => tag.names, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'tag_id' })
  tag?: TagEntity;
}
