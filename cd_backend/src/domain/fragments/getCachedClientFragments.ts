import { DataSource } from 'typeorm';
import { FragmentEntity } from '../../db/entities/Fragment';
import { createCache } from 'async-cache-dedupe';

const getClientFragments =
  ({ dbConnection }: { dbConnection: DataSource }) =>
  async ({ languageCode, page = 1, limit = 500 }: { languageCode: string; page?: number; limit?: number }) => {
    const fragmentRepo = dbConnection.getRepository(FragmentEntity);

    // Calculate skip for pagination
    const skip = (page - 1) * limit;

    // Get total count for pagination metadata
    const totalCount = await fragmentRepo
      .createQueryBuilder('fragment')
      .cache(600000) // 10 minutes
      .getCount();

    // Get fragments with all related data filtered by language
    const fragments = await fragmentRepo
      .createQueryBuilder('fragment')
      .select([
        'fragment.id',
        'fragment.title',
        'fragment.durationSec',
        'fragment.playerUrl',
        'fragment.thumbnailUrl',
        'person.id',
        'person.name',
        'bios.id',
        'bios.bio',
        'biosLanguage.code',
        'country.id',
        'country.code',
        'countryNames.id',
        'countryNames.name',
        'countryNamesLanguage.code',
        'tags.id',
        'tagNames.id',
        'tagNames.name',
        'tagNamesLanguage.code',
      ])
      .leftJoin('fragment.person', 'person')
      .leftJoin('person.bios', 'bios')
      .leftJoin('bios.language', 'biosLanguage')
      .leftJoin('person.country', 'country')
      .leftJoin('country.names', 'countryNames')
      .leftJoin('countryNames.language', 'countryNamesLanguage')
      .leftJoin('fragment.tags', 'tags')
      .leftJoin('tags.names', 'tagNames')
      .leftJoin('tagNames.language', 'tagNamesLanguage')
      .where('(biosLanguage.code = :languageCode OR biosLanguage.code IS NULL)')
      .andWhere('(countryNamesLanguage.code = :languageCode OR countryNamesLanguage.code IS NULL)')
      .andWhere('(tagNamesLanguage.code = :languageCode OR tagNamesLanguage.code IS NULL)')
      .orderBy('fragment.title', 'ASC')
      .skip(skip)
      .take(limit)
      .setParameter('languageCode', languageCode)
      // Enable query caching for 10 minutes
      .cache(600000)
      .getMany();

    // Process fragments in batches to reduce memory pressure
    const BATCH_SIZE = 50;
    let result = [];

    for (let i = 0; i < fragments.length; i += BATCH_SIZE) {
      const batch = fragments.slice(i, i + BATCH_SIZE);
      const processedBatch = batch.map((fragment) => formatFragmentResponse({ fragment, languageCode }));
      result.push(...processedBatch);
    }

    return {
      data: result,
      pagination: {
        total: totalCount,
        page,
        limit,
        pages: Math.ceil(totalCount / limit),
      },
    };
  };

// Helper function to format fragment response
function formatFragmentResponse({ fragment, languageCode }: { fragment: FragmentEntity; languageCode: string }) {
  // Helper function to get localized content with English fallback - with explicit string return type
  const getLocalizedContent = ({
    items,
    contentKey,
  }: {
    items: { language?: { code?: string }; [key: string]: any }[] | undefined;
    contentKey: string;
  }): string => {
    if (!items || items.length === 0) return '';

    // Try requested language
    const localizedItem = items.find((item) => item.language?.code === languageCode);
    if (localizedItem) return localizedItem[contentKey] || '';

    // Try English fallback
    const englishItem = items.find((item) => item.language?.code === 'EN');
    if (englishItem) return englishItem[contentKey] || '';

    // Use first available item as last resort
    return items[0][contentKey] || '';
  };

  // Person info with bio
  const person = fragment.person
    ? {
        id: fragment.person.id,
        name: fragment.person.name,
        bio: getLocalizedContent({ items: fragment.person.bios, contentKey: 'bio' }),
        country: fragment.person.country
          ? {
              code: fragment.person.country.code,
              name: getLocalizedContent({ items: fragment.person.country.names, contentKey: 'name' }),
            }
          : { code: '', name: '' },
      }
    : null;

  // Tags with localized names
  const tags = (fragment.tags || []).map((tag) => ({
    id: tag.id,
    name: getLocalizedContent({ items: tag.names, contentKey: 'name' }),
  }));

  return {
    id: fragment.id,
    title: fragment.title,
    duration: fragment.durationSec,
    playerUrl: fragment.playerUrl,
    thumbnailUrl: fragment.thumbnailUrl,
    person,
    tags,
  };
}

export type GetCachedClientFragments = ReturnType<typeof createGetCachedClientFragments>;

const createGetCachedClientFragments = ({ dbConnection }: { dbConnection: DataSource }) => {
  // Cache with shorter TTL but longer stale time to reduce database pressure
  const cache = createCache({
    ttl: 30 * 60, // 30 minutes fresh cache
    stale: 3 * 60 * 60, // 3 hours stale cache
    storage: {
      type: 'memory',
    },
  }).define('getClientFragments', getClientFragments({ dbConnection }));

  return async (params: { languageCode: string; page?: number; limit?: number }) => {
    return await cache.getClientFragments(params);
  };
};

export default createGetCachedClientFragments;
