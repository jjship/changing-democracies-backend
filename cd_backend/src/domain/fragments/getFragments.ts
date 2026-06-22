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
  const queryBuilder = dbConnection
    .getRepository(FragmentEntity)
    .createQueryBuilder('fragment')
    // Always load person + country so the endpoint honors its schema. Previously these
    // were only joined when filtering by personIds, so an unfiltered GET /fragments
    // returned person:null for every fragment even when links existed in the DB — which
    // left the Videos panel person/country filters empty.
    .leftJoinAndSelect('fragment.person', 'person')
    .leftJoinAndSelect('person.country', 'country')
    .leftJoinAndSelect('country.names', 'countryNames');

  if (personIds && personIds.length > 0) {
    queryBuilder.andWhere('person.id IN (:...personIds)', { personIds });
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
