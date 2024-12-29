import { DataSource } from 'typeorm';
import { FragmentEntity } from '../../db/entities/Fragment';
import { Logger } from '../../services/logger/logger';
import { Fragment, parseFragmentEntity } from '../../http/fragments/fragment.schema';

export { getFragments };

const getFragments = async ({ dbConnection }: { dbConnection: DataSource; logger: Logger }): Promise<Fragment[]> => {
  const dbFragments = await dbConnection
    .getRepository(FragmentEntity)
    .find({ relations: ['person', 'person.country', 'tags', 'narrativeFragments', 'narrativeFragments.narrative'] });

  return dbFragments.map((entity) => parseFragmentEntity(entity));
};
