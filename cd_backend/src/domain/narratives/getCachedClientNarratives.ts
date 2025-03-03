import { DataSource } from 'typeorm';
import { NarrativeEntity } from '../../db/entities/Narrative';
import { NarrativeFragmentEntity } from '../../db/entities/NarrativeFragment';
import { createCache } from 'async-cache-dedupe';

const getClientNarratives =
  ({ dbConnection }: { dbConnection: DataSource }) =>
  async ({ languageCode }: { languageCode: string }) => {
    const narrativeRepo = dbConnection.getRepository(NarrativeEntity);
    const fragmentRepo = dbConnection.getRepository(NarrativeFragmentEntity);

    const narratives = await narrativeRepo.find({
      relations: [
        'names',
        'names.language',
        'descriptions',
        'descriptions.language',
        'narrativeFragments',
        'narrativeFragments.fragment',
        'narrativeFragments.fragment.person',
        'narrativeFragments.fragment.person.country',
        'narrativeFragments.fragment.person.country.names',
        'narrativeFragments.fragment.person.country.names.language',
        'narrativeFragments.fragment.person.bios',
        'narrativeFragments.fragment.person.bios.language',
      ],
    });

    return await Promise.all(
      narratives.map(async (narrative) => {
        const title = narrative.names?.find((name) => name.language.code === languageCode)?.name || 'Untitled';

        const descriptions =
          narrative.descriptions
            ?.filter((desc) => desc.language.code === languageCode)
            .map((desc) => ({
              languageCode: desc.language.code,
              description: desc.description,
            })) || [];

        const fragments = await Promise.all(
          narrative.narrativeFragments?.map(async (narrativeFragment) => {
            const otherNarratives = await fragmentRepo.find({
              where: { fragment: { id: narrativeFragment.fragment.id } },
              relations: ['narrative', 'narrative.names', 'narrative.names.language'],
            });

            const otherPaths = otherNarratives
              .filter((nf) => nf.narrative.id !== narrative.id)
              .map((nf) => {
                const otherTitle =
                  nf.narrative.names?.find((name) => name.language.code === languageCode)?.name || 'Untitled';
                return { id: nf.narrative.id, title: otherTitle };
              });

            return {
              guid: narrativeFragment.fragment.id,
              title: narrativeFragment.fragment.title,
              length: narrativeFragment.fragment.durationSec,
              sequence: narrativeFragment.sequence,
              person: narrativeFragment.fragment.person?.name,
              bios:
                narrativeFragment.fragment.person?.bios?.map((bio) => ({
                  languageCode: bio.language.code,
                  bio: bio.bio,
                })) || [],
              country: narrativeFragment.fragment.person?.country?.names?.find(
                (name) => name.language.code === languageCode
              )?.name,
              playerUrl: narrativeFragment.fragment.playerUrl,
              thumbnailUrl: narrativeFragment.fragment.thumbnailUrl,
              otherPaths,
            };
          }) || []
        );

        return {
          id: narrative.id,
          title,
          descriptions,
          total_length: narrative.totalDurationSec,
          fragments,
        };
      })
    );
  };

export type GetCachedClientNarratives = ReturnType<typeof createGetCachedClientNarratives>;

const createGetCachedClientNarratives = ({ dbConnection }: { dbConnection: DataSource }) => {
  const cache = createCache({
    ttl: 1 * 60 * 60,
    stale: 3 * 60 * 60,
    storage: { type: 'memory' },
  }).define('getClientNarratives', getClientNarratives({ dbConnection }));

  return async ({ languageCode }: { languageCode: string }) => {
    return await cache.getClientNarratives({ languageCode });
  };
};

export default createGetCachedClientNarratives;
