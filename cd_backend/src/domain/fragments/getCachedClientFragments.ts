import { DataSource } from 'typeorm';
import { createCache } from 'async-cache-dedupe';
import { FragmentEntity } from '../../db/entities/Fragment';
import { TagEntity } from '../../db/entities/Tag';
import { LanguageEntity } from '../../db/entities/Language';

// Function to get language ID by code
const getLanguageId = async (dbConnection: DataSource, languageCode: string): Promise<string | null> => {
  try {
    const languageRepo = dbConnection.getRepository(LanguageEntity);
    const language = await languageRepo.findOne({
      where: { code: languageCode.toUpperCase() },
      select: ['id'],
    });
    return language?.id || null;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Error retrieving language ID:', err);
    return null;
  }
};

// Function to get the free browsing tag ID (accepts pre-fetched English language ID)
const getFreeBrowsingTagId = async (
  dbConnection: DataSource,
  englishLanguageId: string | null,
): Promise<string | null> => {
  try {
    if (!englishLanguageId) {
      return null;
    }

    const tagRepo = dbConnection.getRepository(TagEntity);

    const tag = await tagRepo
      .createQueryBuilder('tag')
      .innerJoin('tag.names', 'name')
      .where('LOWER(name.name) = LOWER(:tagName)')
      .andWhere('name.language_id = :languageId')
      .setParameter('tagName', 'free browsing')
      .setParameter('languageId', englishLanguageId)
      .select('tag.id')
      .getOne();

    return tag?.id || null;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Error retrieving free browsing tag ID:', err);
    return null;
  }
};

const getClientFragments =
  ({ dbConnection }: { dbConnection: DataSource }) =>
  async ({ languageCode, page = 1, limit = 500 }: { languageCode: string; page?: number; limit?: number }) => {
    // Parallel initial lookups — fetch both language IDs concurrently
    const [languageId, englishLanguageId] = await Promise.all([
      getLanguageId(dbConnection, languageCode),
      getLanguageId(dbConnection, 'EN'),
    ]);

    if (!languageId) {
      return {
        data: [],
        pagination: { total: 0, page, limit, pages: 0 },
      };
    }

    // Get the free browsing tag ID (reuses englishLanguageId, no redundant lookup)
    const freeBrowsingTagId = await getFreeBrowsingTagId(dbConnection, englishLanguageId);

    if (!freeBrowsingTagId) {
      return {
        data: [],
        pagination: { total: 0, page, limit, pages: 0 },
      };
    }

    const skip = (page - 1) * limit;
    const fragmentRepo = dbConnection.getRepository(FragmentEntity);

    try {
      // Step 1: Get count and fragment IDs in parallel
      const [totalCount, fragmentIds] = await Promise.all([
        fragmentRepo
          .createQueryBuilder('fragment')
          .select('COUNT(DISTINCT fragment.id)', 'count')
          .innerJoin('fragment.tags', 'tag')
          .where('tag.id = :tagId', { tagId: freeBrowsingTagId })
          .cache(1800000)
          .getRawOne()
          .then((result) => parseInt(result?.count || '0', 10)),

        fragmentRepo
          .createQueryBuilder('fragment')
          .select(['fragment.id', 'fragment.title'])
          .innerJoin('fragment.tags', 'tag')
          .where('tag.id = :tagId', { tagId: freeBrowsingTagId })
          .orderBy('fragment.title', 'ASC')
          .skip(skip)
          .take(limit)
          .cache(1800000)
          .getMany()
          .then((fragments) => fragments.map((f) => f.id)),
      ]);

      if (fragmentIds.length === 0) {
        return {
          data: [],
          pagination: {
            total: totalCount,
            page,
            limit,
            pages: Math.ceil(totalCount / limit),
          },
        };
      }

      // Safety check
      const safeIds = fragmentIds.length > 500 ? fragmentIds.slice(0, 500) : fragmentIds;

      const cacheTimeMs = 3600000; // 1 hour
      const relatedDataCacheTimeMs = 7200000; // 2 hours

      // Step 2: Load base fragment data + all relations in parallel (no batching needed)
      const [fragments, fragmentsWithPerson, fragmentsWithTags] = await Promise.all([
        fragmentRepo
          .createQueryBuilder('fragment')
          .select([
            'fragment.id',
            'fragment.title',
            'fragment.durationSec',
            'fragment.playerUrl',
            'fragment.thumbnailUrl',
          ])
          .where('fragment.id IN (:...fragmentIds)', { fragmentIds: safeIds })
          .orderBy('fragment.id', 'ASC')
          .cache(cacheTimeMs)
          .getMany(),

        fragmentRepo
          .createQueryBuilder('fragment')
          .select(['fragment.id'])
          .leftJoinAndSelect('fragment.person', 'person')
          .leftJoinAndSelect('person.bios', 'bios')
          .leftJoinAndSelect('bios.language', 'biosLanguage')
          .leftJoinAndSelect('person.country', 'country')
          .leftJoinAndSelect('country.names', 'countryNames')
          .leftJoinAndSelect('countryNames.language', 'countryNamesLanguage')
          .where('fragment.id IN (:...fragmentIds)', { fragmentIds: safeIds })
          .cache(relatedDataCacheTimeMs)
          .getMany(),

        fragmentRepo
          .createQueryBuilder('fragment')
          .select(['fragment.id'])
          .leftJoinAndSelect('fragment.tags', 'tags')
          .leftJoinAndSelect('tags.names', 'tagNames')
          .leftJoinAndSelect('tagNames.language', 'tagNamesLanguage')
          .where('fragment.id IN (:...fragmentIds)', { fragmentIds: safeIds })
          .cache(relatedDataCacheTimeMs)
          .getMany(),
      ]);

      // Build lookup maps for O(1) merging instead of O(n) find per fragment
      const personMap = new Map(fragmentsWithPerson.map((f) => [f.id, f.person]));
      const tagsMap = new Map(fragmentsWithTags.map((f) => [f.id, f.tags]));

      // Merge relations and format in one pass
      const result = fragments
        .map((fragment) => {
          fragment.person = personMap.get(fragment.id) ?? fragment.person;
          fragment.tags = tagsMap.get(fragment.id) ?? fragment.tags;
          return formatFragmentResponse({
            fragment,
            languageCode,
            languageId,
            englishLanguageId,
          });
        })
        .sort((a, b) => a.title.toLowerCase().localeCompare(b.title.toLowerCase()));

      return {
        data: result,
        pagination: {
          total: totalCount,
          page,
          limit,
          pages: Math.ceil(totalCount / limit),
        },
      };
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Error fetching fragment details:', err);
      return {
        data: [],
        pagination: { total: 0, page, limit, pages: 0 },
      };
    }
  };

// Helper function to format fragment response
function formatFragmentResponse({
  fragment,
  languageCode,
  languageId,
  englishLanguageId,
}: {
  fragment: FragmentEntity;
  languageCode: string;
  languageId: string;
  englishLanguageId: string | null;
}) {
  const getLocalizedContent = ({
    items,
    contentKey,
  }: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    items: { language?: { id?: string; code?: string }; [key: string]: any }[] | undefined;
    contentKey: string;
  }): string => {
    if (!items || items.length === 0) return '';

    if (languageId) {
      const localizedItem = items.find((item) => item.language?.id === languageId);
      if (localizedItem) return localizedItem[contentKey] || '';
    }

    const localizedItemByCode = items.find((item) => item.language?.code === languageCode);
    if (localizedItemByCode) return localizedItemByCode[contentKey] || '';

    if (englishLanguageId) {
      const englishItem = items.find((item) => item.language?.id === englishLanguageId);
      if (englishItem) return englishItem[contentKey] || '';
    }

    const englishItemByCode = items.find((item) => item.language?.code === 'EN');
    if (englishItemByCode) return englishItemByCode[contentKey] || '';

    return items[0][contentKey] || '';
  };

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
  // Initialize caches on startup
  getLanguageId(dbConnection, 'EN').catch((err) => {
    // eslint-disable-next-line no-console
    console.error('Failed to initialize language cache:', err);
  });

  const logSlowQueries = (queryTime: number, message: string, threshold = 100) => {
    if (queryTime > threshold) {
      // eslint-disable-next-line no-console
      console.warn(`SLOW QUERY (${queryTime}ms): ${message}`);
    }
  };

  const cache = createCache({
    ttl: 60 * 60, // 60 minutes fresh cache
    stale: 7 * 24 * 60 * 60, // 7 days stale cache
    storage: {
      type: 'memory',
    },
  }).define('getClientFragments', getClientFragments({ dbConnection }));

  // Check indexes in development
  if (process.env.NODE_ENV === 'development') {
    dbConnection
      .query(
        `SELECT tablename, indexname, indexdef FROM pg_indexes
       WHERE tablename IN ('fragment', 'fragment_tags', 'tag', 'name')
       ORDER BY tablename, indexname;`,
      )
      .then((indexes) => {
        const necessaryIndexes = [
          { table: 'fragment_tags', column: 'tag_id' },
          { table: 'fragment', column: 'title' },
          { table: 'name', column: 'language_id' },
        ];

        const missingIndexes = necessaryIndexes.filter(
          (needed) =>
            !indexes.some(
              (idx: { tablename: string; indexdef: string }) =>
                idx.tablename === needed.table && idx.indexdef.includes(`(${needed.column}`),
            ),
        );

        if (missingIndexes.length > 0) {
          // eslint-disable-next-line no-console
          console.warn('Missing recommended database indexes:');
          for (const missing of missingIndexes) {
            // eslint-disable-next-line no-console
            console.warn(`- Index on ${missing.table}(${missing.column})`);
          }
        }
      })
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.error('Failed to check database indexes:', err);
      });
  }

  return async (params: { languageCode: string; page?: number; limit?: number }) => {
    const startTime = Date.now();

    const CACHE_INVALIDATION_TIMESTAMP = '20230705-fragment-ids-cache';
    const cacheKey = { ...params, _cacheInvalidation: CACHE_INVALIDATION_TIMESTAMP };

    const result = await cache.getClientFragments(cacheKey);

    const totalTime = Date.now() - startTime;
    logSlowQueries(totalTime, `getClientFragments(${JSON.stringify(params)})`, 500);

    return result;
  };
};

export default createGetCachedClientFragments;
