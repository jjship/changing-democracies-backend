import { DataSource } from 'typeorm';
import { FragmentEntity } from '../../db/entities/Fragment';
import { type FragmentPayload, parseFragmentEntity } from './fragments.api';

export { getFragments, getFragmentById };

async function getFragments({
  dbConnection,
  personIds,
}: {
  dbConnection: DataSource;
  personIds?: string[];
}): Promise<FragmentPayload[]> {
  const queryBuilder = dbConnection.getRepository(FragmentEntity).createQueryBuilder('fragment');

  if (personIds && personIds.length > 0) {
    queryBuilder.leftJoinAndSelect('fragment.person', 'person').andWhere('person.id IN (:...personIds)', { personIds });
  }

  const dbFragments = await queryBuilder.getMany();

  return dbFragments
    .map((entity) => parseFragmentEntity(entity))
    .sort((a, b) => a.attributes.title.localeCompare(b.attributes.title));
}

const getFragmentById =
  ({ dbConnection }: { dbConnection: DataSource }) =>
  async (fragmentId: string): Promise<FragmentPayload | null> => {
    const dbFragment = await dbConnection.getRepository(FragmentEntity).findOne({
      where: { id: fragmentId },
      relations: ['person', 'person.country', 'tags', 'narrativeFragments', 'narrativeFragments.narrative'],
    });

    return dbFragment ? parseFragmentEntity(dbFragment) : null;
  };
