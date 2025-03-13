import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn, BeforeInsert } from 'typeorm';
import { PersonEntity } from './Person';
import { LanguageEntity } from './Language';
import { v4 as uuidv4 } from 'uuid';

@Entity('bio')
export class BioEntity {
  @PrimaryColumn('uuid')
  id: string;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = uuidv4();
    }
  }

  @ManyToOne(() => PersonEntity, (person) => person.bios, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'person_id' })
  person: PersonEntity;

  @ManyToOne(() => LanguageEntity, (language) => language.bios, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'language_id' })
  language: LanguageEntity;

  @Column({ type: 'text' })
  bio: string;
}
