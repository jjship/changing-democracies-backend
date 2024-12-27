import { Column, Entity, PrimaryGeneratedColumn, OneToMany, AfterInsert, AfterUpdate, AfterRemove } from 'typeorm';
import { NarrativeFragmentEntity } from './NarrativeFragment';
import { getDbConnection } from '../db';
import { FragmentEntity } from './Fragment';

@Entity()
export class NarrativeEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  title?: string;

  @Column()
  description?: string;

  @Column({ default: 0 })
  total_duration_sec: number = 0;

  @OneToMany(() => NarrativeFragmentEntity, (narrativeFragment) => narrativeFragment.fragment)
  narrativeFragments: NarrativeFragmentEntity[] = [];

  @AfterInsert()
  @AfterUpdate()
  @AfterRemove()
  async updateTotalLength() {
    const connection = getDbConnection();
    await connection.transaction(async (entityManager) => {
      const fragments = await entityManager.find(NarrativeFragmentEntity, { where: { narrative: this } });
      this.total_duration_sec = fragments.reduce((sum, nf) => sum + nf.fragment.duration_sec, 0);
      await entityManager.save(NarrativeEntity, this);
    });
  }
}
