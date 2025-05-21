import { Column, Entity, ManyToMany, OneToMany, PrimaryColumn, BeforeInsert } from 'typeorm';
import { FragmentEntity } from './Fragment';
import { NameEntity } from './Name';
import { TagCategoryEntity } from './TagCategory';
import { v4 as uuidv4 } from 'uuid';

@Entity('tag')
export class TagEntity {
  @PrimaryColumn('uuid')
  id: string;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = uuidv4();
    }
  }

  @OneToMany(() => NameEntity, (name) => name.tag, { cascade: true })
  names?: NameEntity[];

  @ManyToMany(() => FragmentEntity, (fragment) => fragment.tags)
  fragments?: FragmentEntity[];

  @ManyToMany(() => TagCategoryEntity, (category) => category.tags)
  categories?: TagCategoryEntity[];
}
