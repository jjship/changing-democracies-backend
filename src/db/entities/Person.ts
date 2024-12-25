import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany } from 'typeorm';
import { Country } from './Country';
import { Bio } from './Bio';
import { Fragment } from './Fragment';

@Entity()
export class Person {
  @PrimaryGeneratedColumn('uuid')
  person_id!: string;

  @Column({ unique: true })
  name!: string;

  @ManyToOne(() => Country, (country) => country.persons, { onDelete: 'RESTRICT' })
  country!: Country;

  @OneToMany(() => Bio, (bio) => bio.person)
  bios!: Bio[];

  @OneToMany(() => Fragment, (fragment) => fragment.person)
  fragments!: Fragment[];
}
