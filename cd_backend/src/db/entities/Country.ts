import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { PersonEntity } from './Person';

@Entity()
export class CountryEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  name: string;

  @OneToMany(() => PersonEntity, (person) => person.country)
  persons?: PersonEntity[];
}
