import { Entity, PrimaryColumn, Column, OneToMany, BeforeInsert } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { PersonEntity } from './Person';
import { NameEntity } from './Name';

@Entity('country')
export class CountryEntity {
  @PrimaryColumn('uuid')
  id: string;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = uuidv4();
    }
  }

  @OneToMany(() => NameEntity, (name) => name.country, { cascade: true })
  names?: NameEntity[];

  @Column({ type: 'varchar', length: 2, unique: true })
  code: string;

  @OneToMany(() => PersonEntity, (person) => person.country)
  persons?: PersonEntity[];
}
