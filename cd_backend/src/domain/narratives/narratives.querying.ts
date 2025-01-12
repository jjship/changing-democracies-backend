import { DataSource } from 'typeorm';
import { NarrativeEntity } from '../../db/entities/Narrative';
import { NarrativePayload, parseNarrativeEntity } from './narratives.api';

export { getAllNarratives, getNarrativeById };

const getAllNarratives = async ({ dbConnection }: { dbConnection: DataSource }): Promise<NarrativePayload[]> => {
  const dbNarratives = await dbConnection
    .getRepository(NarrativeEntity)
    .find({ relations: ['narrativeFragments', 'narrativeFragments.fragment', 'descriptions', 'descriptions.country'] });

  return dbNarratives.map((entity) => parseNarrativeEntity(entity));
};

const getNarrativeById =
  ({ dbConnection }: { dbConnection: DataSource }) =>
  async (narrativeId: string): Promise<NarrativePayload | null> => {
    const dbNarrative = await dbConnection.getRepository(NarrativeEntity).findOne({
      where: { id: narrativeId },
      relations: ['narrativeFragments', 'narrativeFragments.fragment', 'descriptions', 'descriptions.country'],
    });

    return dbNarrative ? parseNarrativeEntity(dbNarrative) : null;
  };
