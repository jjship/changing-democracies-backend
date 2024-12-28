import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany } from 'typeorm';
import { CountryEntity } from './Country';
import { BioEntity } from './Bio';
import { FragmentEntity } from './Fragment';

@Entity()
export class PersonEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @ManyToOne(() => CountryEntity, (country) => country.persons, { onDelete: 'RESTRICT' })
  country?: CountryEntity;

  @OneToMany(() => BioEntity, (bio) => bio.person)
  bios?: BioEntity[];

  @OneToMany(() => FragmentEntity, (fragment) => fragment.person)
  fragments?: FragmentEntity[];
}
