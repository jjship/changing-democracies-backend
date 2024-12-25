import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Person } from './Person';

@Entity()
export class Country {
  @PrimaryGeneratedColumn('uuid')
  country_id!: string;

  @Column({ type: 'text' })
  name!: string;

  @OneToMany(() => Person, (person) => person.country)
  persons!: Person[];
}
