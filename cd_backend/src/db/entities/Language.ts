import { Entity, PrimaryColumn, Column, OneToMany, Index, BeforeInsert } from 'typeorm';
import { PersonEntity } from './Person';
import { BioEntity } from './Bio';
import { DescriptionEntity } from './Description';
import { v4 as uuidv4 } from 'uuid';

@Entity('language')
export class LanguageEntity {
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

  @Column({ type: 'varchar', length: 2, unique: true })
  @Index('idx_language_code')
  code: string;

  @OneToMany(() => BioEntity, (bio) => bio.language)
  bios?: BioEntity[];

  @OneToMany(() => DescriptionEntity, (description) => description.language)
  descriptions?: DescriptionEntity[];
}
