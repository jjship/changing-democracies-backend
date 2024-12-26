import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Person } from './Person';

@Entity()
export class Bio {
  @PrimaryGeneratedColumn('uuid')
  bio_id!: string;

  @Column({ length: 2, unique: true })
  language_code!: string;

  @Column({ type: 'text' })
  bio!: string;

  @ManyToOne(() => Person, (person) => person.bios)
  person!: Person;
}
