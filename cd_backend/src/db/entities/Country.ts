import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { PersonEntity } from './Person';
import { NameEntity } from './Name';

@Entity()
export class CountryEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToMany(() => NameEntity, (name) => name.country, { cascade: true })
  names?: NameEntity[];

  @Column({ type: 'varchar', length: 2, unique: true })
  code: string;

  @OneToMany(() => PersonEntity, (person) => person.country)
  persons?: PersonEntity[];
}
