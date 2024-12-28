import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { PersonEntity } from './Person';

@Entity()
export class BioEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 2, unique: true })
  language_code: string;

  @Column({ type: 'text' })
  bio: string;

  @ManyToOne(() => PersonEntity, (person) => person.bios)
  person: PersonEntity;
}
