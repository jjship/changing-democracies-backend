import { DataSource } from 'typeorm';
import { FragmentEntity } from '../../db/entities/Fragment';
import { createCache } from 'async-cache-dedupe';
import { TagEntity } from '../../db/entities/Tag';
import { LanguageEntity } from '../../db/entities/Language';

// Create a separate cache for the free browsing tag ID with 24 hour TTL
let freeBrowsingTagCache: { id: string; timestamp: number } | null = null;
const FREE_BROWSING_TAG_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours in ms

// Create a cache for language code to ID mappings with 24 hour TTL
interface LanguageCache {
  languages: { [code: string]: string };
  timestamp: number;
}
let languageCache: LanguageCache | null = null;
const LANGUAGE_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours in ms

// Create a cache specifically for fragment IDs with longer TTL
interface FragmentIdsCache {
  [key: string]: {
    ids: string[];
    totalCount: number;
    timestamp: number;
  };
}
let fragmentIdsCache: FragmentIdsCache = {};
const FRAGMENT_IDS_CACHE_TTL = 3 * 60 * 60 * 1000; // 3 hours in ms (increased from 1 hour)

// Function to get language ID by code (cached for 24 hours)
const getLanguageId = async (dbConnection: DataSource, languageCode: string): Promise<string | null> => {
  try {
    // Initialize cache if needed
    if (!languageCache || Date.now() - languageCache.timestamp >= LANGUAGE_CACHE_TTL) {
      const languageRepo = dbConnection.getRepository(LanguageEntity);
      const languages = await languageRepo.find();

      // Create a new cache object with all languages
      const langMap: { [code: string]: string } = {};
      languages.forEach((lang) => {
        // Ensure language codes are stored in uppercase for consistent lookups
        langMap[lang.code.toUpperCase()] = lang.id;
      });

      // Create the cache with languages and timestamp as separate properties
      languageCache = {
        languages: langMap,
        timestamp: Date.now(),
      };
    }

    // Convert input language code to uppercase for consistent lookup
    const normalizedCode = languageCode.toUpperCase();

    // Return the language ID if found in cache
    return languageCache && languageCache.languages[normalizedCode] ? languageCache.languages[normalizedCode] : null;
  } catch (error) {
    console.error('Error retrieving language ID:', error);
    return null;
  }
};

// Function to get the free browsing tag ID (cached for 24 hours)
const getFreeBrowsingTagId = async (dbConnection: DataSource): Promise<string | null> => {
  try {
    // Check if we have a valid cached tag ID
    if (freeBrowsingTagCache && Date.now() - freeBrowsingTagCache.timestamp < FREE_BROWSING_TAG_CACHE_TTL) {
      return freeBrowsingTagCache.id;
    }

    // Get English language ID from cache
    const englishLanguageId = await getLanguageId(dbConnection, 'EN');
    if (!englishLanguageId) {
      return null;
    }

    // Query for the free browsing tag ID using language ID directly
    const tagRepo = dbConnection.getRepository(TagEntity);

    // Find the tag with name "free browsing" in English using language ID
    const tag = await tagRepo
      .createQueryBuilder('tag')
      .innerJoin('tag.names', 'name')
      .where('name.name = :tagName')
      .andWhere('name.language_id = :languageId')
      .setParameter('tagName', 'free browsing')
      .setParameter('languageId', englishLanguageId)
      .select('tag.id')
      .getOne();

    if (tag) {
      // Cache the tag ID for future use
      freeBrowsingTagCache = { id: tag.id, timestamp: Date.now() };
      return tag.id;
    }

    return null;
  } catch (error) {
    console.error('Error retrieving free browsing tag ID:', error);
    return null;
  }
};

const getClientFragments =
  ({ dbConnection }: { dbConnection: DataSource }) =>
  async ({ languageCode, page = 1, limit = 500 }: { languageCode: string; page?: number; limit?: number }) => {
    // Get language ID from cache
    const languageId = await getLanguageId(dbConnection, languageCode);

    if (!languageId) {
      return {
        data: [],
        pagination: {
          total: 0,
          page,
          limit,
          pages: 0,
        },
      };
    }

    // Get English language ID for fallbacks
    const englishLanguageId = await getLanguageId(dbConnection, 'EN');

    // Get the free browsing tag ID from cache or database
    const freeBrowsingTagId = await getFreeBrowsingTagId(dbConnection);

    // If tag doesn't exist, return empty results
    if (!freeBrowsingTagId) {
      return {
        data: [],
        pagination: {
          total: 0,
          page,
          limit,
          pages: 0,
        },
      };
    }

    // Calculate skip for pagination
    const skip = (page - 1) * limit;

    // Create a cache key based on tag ID, page, and limit
    const cacheKey = `${freeBrowsingTagId}_page${page}_limit${limit}`;

    // Try to get fragment IDs from cache first
    let fragmentIds: string[] = [];
    let totalCount = 0;

    const cachedFragmentData = fragmentIdsCache[cacheKey];
    if (cachedFragmentData && Date.now() - cachedFragmentData.timestamp < FRAGMENT_IDS_CACHE_TTL) {
      fragmentIds = cachedFragmentData.ids;
      totalCount = cachedFragmentData.totalCount;
    } else {
      const fragmentRepo = dbConnection.getRepository(FragmentEntity);

      try {
        // Step 1: Get total count using a lightweight query
        totalCount = await fragmentRepo
          .createQueryBuilder('fragment')
          .select('COUNT(DISTINCT fragment.id)', 'count')
          .innerJoin('fragment.tags', 'tag')
          .where('tag.id = :tagId', { tagId: freeBrowsingTagId })
          .cache(1800000) // 30 minutes cache (increased from 10 minutes)
          .getRawOne()
          .then((result) => parseInt(result?.count || '0', 10));

        // Step 2: Get only the fragment IDs with minimal data needed for pagination and sorting
        fragmentIds = await fragmentRepo
          .createQueryBuilder('fragment')
          .select(['fragment.id', 'fragment.title']) // Include title in selection to support ordering
          .innerJoin('fragment.tags', 'tag')
          .where('tag.id = :tagId', { tagId: freeBrowsingTagId })
          .orderBy('fragment.title', 'ASC') // This query handles pagination, so we need proper sorting here
          .skip(skip)
          .take(limit)
          .cache(1800000) // 30 minutes cache (increased from 10 minutes)
          .getMany()
          .then((fragments) => fragments.map((f) => f.id));

        // Cache the fragment IDs and total count
        fragmentIdsCache[cacheKey] = {
          ids: fragmentIds,
          totalCount,
          timestamp: Date.now(),
        };
      } catch (error) {
        console.error('Error executing fragment queries:', error);
        totalCount = 0;
        fragmentIds = [];
      }
    }
    console.timeEnd('fragmentIdsQuery');

    // If no fragments match criteria, return empty results
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

    // Step 3: Get complete fragment data only for the IDs we need
    const fragmentRepo = dbConnection.getRepository(FragmentEntity);

    let fragments: FragmentEntity[] = [];

    try {
      // Only attempt to fetch details if we have fragment IDs
      if (fragmentIds.length > 0) {
        // Safety check: if we have too many IDs, it could cause SQL generation issues
        // Limit to 500 IDs max - this should match the limit parameter
        if (fragmentIds.length > 500) {
          console.warn(`FragmentIds array too large (${fragmentIds.length}), truncating to 500`);
          fragmentIds = fragmentIds.slice(0, 500);
        }

        // Increase cache time for better performance
        const cacheTimeMs = 3600000; // 1 hour

        // Optimize query execution with simple select and no complex conditions
        fragments = await fragmentRepo
          .createQueryBuilder('fragment')
          .select([
            'fragment.id',
            'fragment.title',
            'fragment.durationSec',
            'fragment.playerUrl',
            'fragment.thumbnailUrl',
          ])
          .where('fragment.id IN (:...fragmentIds)', { fragmentIds })
          .orderBy('fragment.id', 'ASC') // Use ID sorting for database performance
          .cache(cacheTimeMs)
          .getMany();

        // Then, for each batch of fragments, load the related entities separately and merge the data in memory
        if (fragments.length > 0) {
          const batchSize = Math.min(50, fragments.length);
          const batches = Math.ceil(fragments.length / batchSize);

          // Use a longer cache time for related data to improve performance on subsequent requests
          const relatedDataCacheTimeMs = 7200000; // 2 hours

          // Process batches in serial to avoid overwhelming the database
          for (let batchIndex = 0; batchIndex < batches; batchIndex++) {
            try {
              const start = batchIndex * batchSize;
              const end = Math.min(start + batchSize, fragments.length);
              const batchFragmentIds = fragments.slice(start, end).map((f) => f.id);

              // Run both queries in parallel for better performance
              const [fragmentsWithPerson, fragmentsWithTags] = await Promise.all([
                // Load person data with bios and country
                fragmentRepo
                  .createQueryBuilder('fragment')
                  .select(['fragment.id'])
                  .leftJoinAndSelect('fragment.person', 'person')
                  .leftJoinAndSelect('person.bios', 'bios')
                  .leftJoinAndSelect('bios.language', 'biosLanguage')
                  .leftJoinAndSelect('person.country', 'country')
                  .leftJoinAndSelect('country.names', 'countryNames')
                  .leftJoinAndSelect('countryNames.language', 'countryNamesLanguage')
                  .where('fragment.id IN (:...batchFragmentIds)', { batchFragmentIds })
                  .cache(relatedDataCacheTimeMs)
                  .getMany(),

                // Load tags data
                fragmentRepo
                  .createQueryBuilder('fragment')
                  .select(['fragment.id'])
                  .leftJoinAndSelect('fragment.tags', 'tags')
                  .leftJoinAndSelect('tags.names', 'tagNames')
                  .leftJoinAndSelect('tagNames.language', 'tagNamesLanguage')
                  .where('fragment.id IN (:...batchFragmentIds)', { batchFragmentIds })
                  .cache(relatedDataCacheTimeMs)
                  .getMany(),
              ]);

              // Merge the loaded relations back to the main fragments array
              for (let i = start; i < end; i++) {
                const fragment = fragments[i];
                const fragmentWithPerson = fragmentsWithPerson.find((f) => f.id === fragment.id);
                const fragmentWithTags = fragmentsWithTags.find((f) => f.id === fragment.id);

                if (fragmentWithPerson) {
                  fragment.person = fragmentWithPerson.person;
                }

                if (fragmentWithTags) {
                  fragment.tags = fragmentWithTags.tags;
                }
              }
            } catch (error) {
              // Continue with other batches even if one fails
              console.error(`Error processing batch ${batchIndex + 1}:`, error);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error fetching fragment details:', error);

      // Try one more time with a very simple query as last resort
      try {
        console.warn('Attempting simplified fallback query');
        fragments = await fragmentRepo
          .createQueryBuilder('fragment')
          .select([
            'fragment.id',
            'fragment.title',
            'fragment.durationSec',
            'fragment.playerUrl',
            'fragment.thumbnailUrl',
          ])
          .where('fragment.id IN (:...fragmentIds)', { fragmentIds })
          .orderBy('fragment.id', 'ASC')
          .getMany();

        console.warn(`Fallback query returned ${fragments.length} fragments with limited data`);
      } catch (fallbackError) {
        console.error('Even fallback query failed:', fallbackError);
        fragments = [];
      }
    }

    // Process fragments in batches to reduce memory pressure
    const BATCH_SIZE = 50;
    let result = [];

    for (let i = 0; i < fragments.length; i += BATCH_SIZE) {
      const batch = fragments.slice(i, i + BATCH_SIZE);
      const processedBatch = batch.map((fragment) =>
        formatFragmentResponse({
          fragment,
          languageCode,
          languageId,
          englishLanguageId,
        })
      );
      result.push(...processedBatch);
    }

    // Sort the final results by title to ensure correct sorting
    // This is much faster than complex SQL sorting with joins
    result.sort((a, b) => {
      const titleA = a.title.toLowerCase();
      const titleB = b.title.toLowerCase();
      return titleA.localeCompare(titleB);
    });

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
  // Helper function to get localized content with English fallback using IDs
  const getLocalizedContent = ({
    items,
    contentKey,
  }: {
    items: { language?: { id?: string; code?: string }; [key: string]: any }[] | undefined;
    contentKey: string;
  }): string => {
    if (!items || items.length === 0) return '';

    // Try requested language by ID first (faster)
    if (languageId) {
      const localizedItem = items.find((item) => item.language?.id === languageId);
      if (localizedItem) return localizedItem[contentKey] || '';
    }

    // Try requested language by code as fallback
    const localizedItemByCode = items.find((item) => item.language?.code === languageCode);
    if (localizedItemByCode) return localizedItemByCode[contentKey] || '';

    // Try English fallback by ID
    if (englishLanguageId) {
      const englishItem = items.find((item) => item.language?.id === englishLanguageId);
      if (englishItem) return englishItem[contentKey] || '';
    }

    // Try English fallback by code
    const englishItemByCode = items.find((item) => item.language?.code === 'EN');
    if (englishItemByCode) return englishItemByCode[contentKey] || '';

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

// Ensure proper garbage collection of large cache objects
function cleanupOldFragmentCache() {
  const now = Date.now();
  const cacheKeys = Object.keys(fragmentIdsCache);

  // Remove expired items from cache
  let expiredCount = 0;
  for (const key of cacheKeys) {
    if (now - fragmentIdsCache[key].timestamp >= FRAGMENT_IDS_CACHE_TTL) {
      delete fragmentIdsCache[key];
      expiredCount++;
    }
  }

  // If cache is too large (more than 100 entries), remove oldest entries
  const remainingKeys = Object.keys(fragmentIdsCache);
  if (remainingKeys.length > 100) {
    // Sort by timestamp (oldest first)
    const sortedKeys = remainingKeys.sort((a, b) => fragmentIdsCache[a].timestamp - fragmentIdsCache[b].timestamp);
    // Remove oldest 20% of entries
    const keysToRemove = sortedKeys.slice(0, Math.floor(sortedKeys.length * 0.2));
    for (const key of keysToRemove) {
      delete fragmentIdsCache[key];
    }
  }
}

// Run cache cleanup every 15 minutes
setInterval(cleanupOldFragmentCache, 15 * 60 * 1000);

const createGetCachedClientFragments = ({ dbConnection }: { dbConnection: DataSource }) => {
  // Initialize all caches on service startup
  Promise.all([
    // Cache language mappings
    getLanguageId(dbConnection, 'EN'),
    // Cache free browsing tag ID
    getFreeBrowsingTagId(dbConnection),
  ]).catch((err) => {
    console.error('Failed to initialize caches:', err);
  });

  // Create a logger function that only logs queries taking longer than threshold
  const logSlowQueries = (queryTime: number, message: string, threshold = 100) => {
    if (queryTime > threshold) {
      console.warn(`SLOW QUERY (${queryTime}ms): ${message}`);
    }
  };

  // Create fragment cache with shorter TTL but longer stale time to reduce database pressure
  const cache = createCache({
    ttl: 60 * 60, // 60 minutes fresh cache (increased from 30 minutes)
    stale: 6 * 60 * 60, // 6 hours stale cache (increased from 3 hours)
    storage: {
      type: 'memory',
    },
    // Remove callbacks that are causing TypeScript errors
  }).define('getClientFragments', getClientFragments({ dbConnection }));

  // Create a function to check for database indexes and suggest optimizations
  const checkDbIndexes = async () => {
    try {
      // Check for necessary indexes on tables used in our queries
      const indexes = await dbConnection.query(`
        SELECT 
          tablename, 
          indexname, 
          indexdef 
        FROM 
          pg_indexes 
        WHERE 
          tablename IN ('fragment', 'fragment_tags', 'tag', 'name') 
        ORDER BY 
          tablename, indexname;
      `);

      // Check if important indexes exist
      const necessaryIndexes = [
        { table: 'fragment_tags', column: 'tag_id' },
        { table: 'fragment', column: 'title' },
        { table: 'name', column: 'language_id' },
      ];

      const missingIndexes = [];

      for (const needed of necessaryIndexes) {
        const found = indexes.some(
          (idx: { tablename: string; indexdef: string }) =>
            idx.tablename === needed.table && idx.indexdef.includes(`(${needed.column}`)
        );

        if (!found) {
          missingIndexes.push(needed);
        }
      }

      if (missingIndexes.length > 0) {
        console.warn('Missing recommended database indexes:');
        for (const missing of missingIndexes) {
          console.warn(`- Index on ${missing.table}(${missing.column})`);
        }
        console.warn('Consider adding these indexes to improve query performance');
      }
    } catch (error) {
      console.error('Error checking database indexes:', error);
    }
  };

  // Check indexes on startup if in development environment
  if (process.env.NODE_ENV === 'development') {
    checkDbIndexes().catch((err) => {
      console.error('Failed to check database indexes:', err);
    });
  }

  return async (params: { languageCode: string; page?: number; limit?: number }) => {
    const startTime = Date.now();

    // Cache invalidation for the query change with optimized implementation
    const CACHE_INVALIDATION_TIMESTAMP = '20230705-fragment-ids-cache';
    const cacheKey = { ...params, _cacheInvalidation: CACHE_INVALIDATION_TIMESTAMP };

    const result = await cache.getClientFragments(cacheKey);

    // Log performance metrics for slow queries (>500ms)
    const totalTime = Date.now() - startTime;
    logSlowQueries(totalTime, `getClientFragments(${JSON.stringify(params)})`, 500);

    return result;
  };
};

export default createGetCachedClientFragments;
