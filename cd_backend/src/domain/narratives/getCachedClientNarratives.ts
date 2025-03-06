import { DataSource } from 'typeorm';
import { NarrativeEntity } from '../../db/entities/Narrative';
import { NarrativeFragmentEntity } from '../../db/entities/NarrativeFragment';
import { createCache } from 'async-cache-dedupe';

const getClientNarratives =
  ({ dbConnection }: { dbConnection: DataSource }) =>
  async () => {
    const narrativeRepo = dbConnection.getRepository(NarrativeEntity);
    const fragmentRepo = dbConnection.getRepository(NarrativeFragmentEntity);

    // Get narratives with all language-specific data
    const narratives = await narrativeRepo
      .createQueryBuilder('narrative')
      .leftJoinAndSelect('narrative.names', 'names')
      .leftJoinAndSelect('names.language', 'namesLanguage')
      .leftJoinAndSelect('narrative.descriptions', 'descriptions')
      .leftJoinAndSelect('descriptions.language', 'descriptionsLanguage')
      .leftJoinAndSelect('narrative.narrativeFragments', 'narrativeFragments')
      .leftJoinAndSelect('narrativeFragments.fragment', 'fragment')
      .leftJoinAndSelect('fragment.person', 'person')
      .leftJoinAndSelect('person.country', 'country')
      .leftJoinAndSelect('country.names', 'countryNames')
      .leftJoinAndSelect('countryNames.language', 'countryNamesLanguage')
      .leftJoinAndSelect('person.bios', 'bios')
      .leftJoinAndSelect('bios.language', 'biosLanguage')
      .orderBy('narrativeFragments.sequence', 'ASC')
      .getMany();

    // Check if we have any narratives before proceeding
    if (narratives.length === 0) {
      return [];
    }

    // Pre-fetch all related information for fragments in a single batch query
    const fragmentIds = narratives
      .flatMap((narrative) => narrative.narrativeFragments || [])
      .map((nf) => nf.fragment?.id)
      .filter((id): id is string => !!id); // Filter out undefined values

    // If there are no fragment IDs, skip the other narratives query
    if (fragmentIds.length === 0) {
      return narratives.map((narrative) => formatNarrativeResponse(narrative, new Map()));
    }

    // Use a batch query to get all otherNarratives for all fragments at once
    const allOtherNarratives = await fragmentRepo
      .createQueryBuilder('narrativeFragment')
      .leftJoinAndSelect('narrativeFragment.fragment', 'fragment')
      .leftJoinAndSelect('narrativeFragment.narrative', 'narrative')
      .leftJoinAndSelect('narrative.names', 'names')
      .leftJoinAndSelect('names.language', 'language')
      .where('fragment.id IN (:...fragmentIds)', { fragmentIds })
      .getMany();

    // Create a lookup map for fast access
    const otherNarrativesMap = new Map<string, NarrativeFragmentEntity[]>();

    allOtherNarratives.forEach((nf: NarrativeFragmentEntity) => {
      if (nf.fragment && nf.fragment.id) {
        const fragmentId = nf.fragment.id;
        if (!otherNarrativesMap.has(fragmentId)) {
          otherNarrativesMap.set(fragmentId, []);
        }
        otherNarrativesMap.get(fragmentId)?.push(nf);
      }
    });

    return narratives.map((narrative) => formatNarrativeResponse(narrative, otherNarrativesMap));
  };

// Helper function to format narrative response
function formatNarrativeResponse(
  narrative: NarrativeEntity,
  otherNarrativesMap: Map<string, NarrativeFragmentEntity[]>
) {
  const titles =
    narrative.names?.map((name) => ({
      languageCode: name.language.code,
      title: name.name,
    })) || [];

  const descriptions =
    narrative.descriptions?.map((desc) => ({
      languageCode: desc.language.code,
      description: desc.description,
    })) || [];
  console.log({ descriptions });
  const fragments = (narrative.narrativeFragments || []).map((narrativeFragment) => {
    // Safety check for fragment
    if (!narrativeFragment.fragment) {
      return {
        guid: '',
        title: '',
        length: 0,
        sequence: narrativeFragment.sequence,
        person: undefined,
        bios: [],
        country: { code: '', names: [] },
        playerUrl: '',
        thumbnailUrl: '',
        otherPaths: [],
      };
    }

    // Get pre-fetched otherNarratives for this fragment
    const otherNarrativesForFragment = otherNarrativesMap.get(narrativeFragment.fragment.id) || [];

    const otherPaths = otherNarrativesForFragment
      .filter((nf) => nf.narrative?.id !== narrative.id)
      .map((nf) => {
        const titles =
          nf.narrative?.names?.map((name) => ({
            languageCode: name.language.code,
            title: name.name,
          })) || [];
        return { id: nf.narrative?.id || '', titles };
      });

    // Format country with all its language names
    const country = narrativeFragment.fragment.person?.country
      ? {
          code: narrativeFragment.fragment.person.country.code,
          names:
            narrativeFragment.fragment.person.country.names?.map((name) => ({
              languageCode: name.language.code,
              name: name.name,
            })) || [],
        }
      : { code: '', names: [] };

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
      country,
      playerUrl: narrativeFragment.fragment.playerUrl,
      thumbnailUrl: narrativeFragment.fragment.thumbnailUrl,
      otherPaths,
    };
  });

  return {
    id: narrative.id,
    titles,
    descriptions,
    total_length: narrative.totalDurationSec,
    fragments,
  };
}

export type GetCachedClientNarratives = ReturnType<typeof createGetCachedClientNarratives>;

const createGetCachedClientNarratives = ({ dbConnection }: { dbConnection: DataSource }) => {
  const cache = createCache({
    ttl: 1 * 60 * 60,
    stale: 3 * 60 * 60,
    storage: { type: 'memory' },
  }).define('getClientNarratives', getClientNarratives({ dbConnection }));

  return async () => {
    return await cache.getClientNarratives();
  };
};

export default createGetCachedClientNarratives;
