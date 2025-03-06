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
    // Improved query with optimized joins and explicit selections
    const narratives = await narrativeRepo
      .createQueryBuilder('narrative')
      .select([
        'narrative.id',
        'narrative.totalDurationSec',
        'names.id',
        'names.name',
        'namesLanguage.code',
        'descriptions.id',
        'descriptions.description',
        'descriptionsLanguage.code',
        'narrativeFragments.sequence',
        'fragment.id',
        'fragment.title',
        'fragment.durationSec',
        'fragment.playerUrl',
        'fragment.thumbnailUrl',
        'person.id',
        'person.name',
        'country.id',
        'country.code',
        'countryNames.id',
        'countryNames.name',
        'countryNamesLanguage.code',
        'bios.id',
        'bios.bio',
        'biosLanguage.code',
      ])
      .leftJoin('narrative.names', 'names')
      .leftJoin('names.language', 'namesLanguage')
      .leftJoin('narrative.descriptions', 'descriptions')
      .leftJoin('descriptions.language', 'descriptionsLanguage')
      .leftJoin('narrative.narrativeFragments', 'narrativeFragments')
      .leftJoin('narrativeFragments.fragment', 'fragment')
      .leftJoin('fragment.person', 'person')
      .leftJoin('person.country', 'country')
      .leftJoin('country.names', 'countryNames')
      .leftJoin('countryNames.language', 'countryNamesLanguage')
      .leftJoin('person.bios', 'bios')
      .leftJoin('bios.language', 'biosLanguage')
      .orderBy('narrativeFragments.sequence', 'ASC')
      // Enable query caching for 10 minutes
      .cache(600000)
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
    // Optimized query with more efficient joining and explicit selections
    const allOtherNarratives = await fragmentRepo
      .createQueryBuilder('narrativeFragment')
      .select(['narrativeFragment.id', 'fragment.id', 'narrative.id', 'names.id', 'names.name', 'language.code'])
      .leftJoin('narrativeFragment.fragment', 'fragment')
      .leftJoin('narrativeFragment.narrative', 'narrative')
      .leftJoin('narrative.names', 'names')
      .leftJoin('names.language', 'language')
      .where('fragment.id IN (:...fragmentIds)', { fragmentIds })
      // Enable query caching for 10 minutes
      .cache(600000)
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

    // Process narratives in batches to reduce memory pressure
    const BATCH_SIZE = 10;
    let result = [];

    for (let i = 0; i < narratives.length; i += BATCH_SIZE) {
      const batch = narratives.slice(i, i + BATCH_SIZE);
      const processedBatch = batch.map((narrative) => formatNarrativeResponse(narrative, otherNarrativesMap));
      result.push(...processedBatch);
    }

    return result;
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

  // Removed console.log for performance

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
  // Improved caching with shorter TTL but longer stale time to reduce database pressure
  const cache = createCache({
    ttl: 30 * 60, // 30 minutes fresh cache
    stale: 3 * 60 * 60, // 3 hours stale cache
    storage: {
      type: 'memory',
    },
  }).define('getClientNarratives', getClientNarratives({ dbConnection }));

  return async () => {
    return await cache.getClientNarratives();
  };
};

export default createGetCachedClientNarratives;
