import { Entity, PrimaryColumn, Column, ManyToOne, Index, JoinColumn, BeforeInsert } from 'typeorm';
import { NarrativeEntity } from './Narrative';
import { CountryEntity } from './Country';
import { LanguageEntity } from './Language';
import { v4 as uuidv4 } from 'uuid';

@Entity('description')
@Index('idx_description_narrative_language', ['narrative', 'language'])
export class DescriptionEntity {
  @PrimaryColumn('uuid')
  id: string;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = uuidv4();
    }
  }

  @ManyToOne(() => NarrativeEntity, (narrative) => narrative.descriptions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'narrative_id' })
  narrative: NarrativeEntity;

  @ManyToOne(() => LanguageEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'language_id' })
  language: LanguageEntity;

  @Column({ type: 'simple-json' })
  description: string[];
}
