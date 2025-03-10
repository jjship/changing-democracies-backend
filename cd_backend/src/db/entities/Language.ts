import { Entity, PrimaryGeneratedColumn, Column, OneToMany, Index } from 'typeorm';
import { PersonEntity } from './Person';
import { BioEntity } from './Bio';
import { DescriptionEntity } from './Description';

@Entity()
export class LanguageEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

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
