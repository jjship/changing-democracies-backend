import { Entity, PrimaryColumn, Column, OneToMany, ManyToOne, JoinColumn, BeforeInsert } from 'typeorm';
import { FragmentEntity } from './Fragment';
import { BioEntity } from './Bio';
import { CountryEntity } from './Country';
import { v4 as uuidv4 } from 'uuid';

@Entity('person')
export class PersonEntity {
  @PrimaryColumn('uuid')
  id: string;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = uuidv4();
    }
  }

  @Column({ type: 'text', unique: true })
  name: string;

  @Column({ type: 'varchar', nullable: true, unique: true, name: 'normalized_name' })
  normalizedName: string;

  @ManyToOne(() => CountryEntity, (country) => country.persons, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({ name: 'country_id' })
  country?: CountryEntity;

  @OneToMany(() => FragmentEntity, (fragment) => fragment.person)
  fragments?: FragmentEntity[];

  @OneToMany(() => BioEntity, (bio) => bio.person, { cascade: true })
  bios?: BioEntity[];
}
