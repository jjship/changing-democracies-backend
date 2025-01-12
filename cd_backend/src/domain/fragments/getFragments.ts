import { DataSource } from 'typeorm';
import { FragmentEntity } from '../../db/entities/Fragment';
import { type FragmentPayload, parseFragmentEntity } from './fragments.api';

export { getFragments, getFragmentById };

const getFragments = async ({ dbConnection }: { dbConnection: DataSource }): Promise<FragmentPayload[]> => {
  const dbFragments = await dbConnection
    .getRepository(FragmentEntity)
    .find({ relations: ['person', 'person.country', 'tags', 'narrativeFragments', 'narrativeFragments.narrative'] });

  return dbFragments.map((entity) => parseFragmentEntity(entity));
};

const getFragmentById =
  ({ dbConnection }: { dbConnection: DataSource }) =>
  async (fragmentId: string): Promise<FragmentPayload | null> => {
    const dbFragment = await dbConnection.getRepository(FragmentEntity).findOne({
      where: { id: fragmentId },
      relations: ['person', 'person.country', 'tags', 'narrativeFragments', 'narrativeFragments.narrative'],
    });

    return dbFragment ? parseFragmentEntity(dbFragment) : null;
  };
