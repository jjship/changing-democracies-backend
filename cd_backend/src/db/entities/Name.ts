import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn, BeforeInsert, Index } from 'typeorm';
import { NarrativeEntity } from './Narrative';
import { LanguageEntity } from './Language';
import { CountryEntity } from './Country';
import { TagEntity } from './Tag';
import { v4 as uuidv4 } from 'uuid';

@Entity('name')
@Index('idx_name_narrative_language', ['narrative', 'language'])
@Index('idx_name_tag_language', ['tag', 'language'])
@Index('idx_name_country_language', ['country', 'language'])
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
  @Index('idx_name_value')
  name: string;

  @Column({ type: 'text' })
  type: string;

  @ManyToOne(() => LanguageEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'language_id' })
  @Index('idx_name_language')
  language: LanguageEntity;

  @ManyToOne(() => CountryEntity, (country) => country.names, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'country_id' })
  country?: CountryEntity;

  @ManyToOne(() => NarrativeEntity, (narrative) => narrative.names, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'narrative_id' })
  @Index('idx_name_narrative')
  narrative?: NarrativeEntity;

  @ManyToOne(() => TagEntity, (tag) => tag.names, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'tag_id' })
  tag?: TagEntity;
}
