import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { PersonEntity } from './Person';
import { LanguageEntity } from './Language';

@Entity()
export class BioEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  bio: string;

  @ManyToOne(() => PersonEntity, (person) => person.bios)
  person: PersonEntity;

  @ManyToOne(() => LanguageEntity, (language) => language.bios)
  language: LanguageEntity;
}
