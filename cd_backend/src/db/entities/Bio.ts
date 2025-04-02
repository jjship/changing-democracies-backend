import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn, BeforeInsert, Index } from 'typeorm';
import { PersonEntity } from './Person';
import { LanguageEntity } from './Language';
import { v4 as uuidv4 } from 'uuid';

@Entity('bio')
@Index('idx_bio_person_language', ['person', 'language'])
export class BioEntity {
  @PrimaryColumn('uuid')
  id: string;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = uuidv4();
    }
  }

  @Column({ type: 'text' })
  bio: string;

  @ManyToOne(() => PersonEntity, (person) => person.bios, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'person_id' })
  person: PersonEntity;

  @ManyToOne(() => LanguageEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'language_id' })
  @Index('idx_bio_language')
  language: LanguageEntity;
}
