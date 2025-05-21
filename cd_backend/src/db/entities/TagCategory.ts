import { Column, Entity, ManyToMany, OneToMany, PrimaryColumn, BeforeInsert, JoinTable } from 'typeorm';
import { TagEntity } from './Tag';
import { NameEntity } from './Name';
import { v4 as uuidv4 } from 'uuid';

@Entity('tag_category')
export class TagCategoryEntity {
  @PrimaryColumn('uuid')
  id: string;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = uuidv4();
    }
  }

  @OneToMany(() => NameEntity, (name) => name.tagCategory, { cascade: true })
  names?: NameEntity[];

  @ManyToMany(() => TagEntity, (tag) => tag.categories)
  @JoinTable({
    name: 'tag_category_tags',
    joinColumn: {
      name: 'tag_category_id',
      referencedColumnName: 'id',
    },
    inverseJoinColumn: {
      name: 'tag_id',
      referencedColumnName: 'id',
    },
  })
  tags?: TagEntity[];
}
