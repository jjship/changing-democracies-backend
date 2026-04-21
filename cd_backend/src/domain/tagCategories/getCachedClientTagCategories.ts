import { DataSource } from 'typeorm';
import { createCache } from 'async-cache-dedupe';
import { TagCategoryEntity } from '../../db/entities/TagCategory';
import { LanguageEntity } from '../../db/entities/Language';

interface TagCategoryWithTags {
  id: string;
  name: string;
  tags: Array<{
    id: string;
    name: string;
  }>;
}

const getTagCategories =
  ({ dbConnection }: { dbConnection: DataSource }) =>
  async (cacheKey: string): Promise<TagCategoryWithTags[]> => {
    // Parse the cache key to get the language code
    const { languageCode } = JSON.parse(cacheKey);

    const language = await dbConnection.getRepository(LanguageEntity).findOne({
      where: { code: languageCode.toUpperCase() },
    });

    if (!language) {
      throw new Error(`Language with code ${languageCode} not found`);
    }

    // Get tag categories with their names and tags
    const tagCategories = await dbConnection
      .getRepository(TagCategoryEntity)
      .createQueryBuilder('tagCategory')
      .leftJoinAndSelect('tagCategory.names', 'names')
      .leftJoinAndSelect('names.language', 'language')
      .leftJoinAndSelect('tagCategory.tags', 'tags')
      .leftJoinAndSelect('tags.names', 'tagNames')
      .leftJoinAndSelect('tagNames.language', 'tagLanguage')
      .where('language.code = :languageCode', { languageCode: language.code })
      .andWhere('(tagLanguage.code = :languageCode OR tagLanguage.code IS NULL)', { languageCode: language.code })
      .cache(3600000) // Cache for 1 hour
      .getMany();

    // Format the response
    const formattedCategories = tagCategories.map((category) => {
      const categoryName = category.names?.find((n) => n.language.code === language.code);
      if (!categoryName) {
        throw new Error(`No name found for tag category ${category.id} in language ${language.code}`);
      }

      return {
        id: category.id,
        name: categoryName.name,
        tags: (category.tags || []).map((tag) => {
          const tagName = tag.names?.find((n) => n.language.code === language.code);
          if (!tagName) {
            throw new Error(`No name found for tag ${tag.id} in language ${language.code}`);
          }

          return {
            id: tag.id,
            name: tagName.name,
          };
        }),
      };
    });

    return formattedCategories;
  };

// Create a cache with longer stale time to reduce database pressure
const createGetCachedClientTagCategories = ({ dbConnection }: { dbConnection: DataSource }) => {
  const cache = createCache({
    ttl: 60 * 60, // 60 minutes fresh cache
    stale: 7 * 24 * 60 * 60, // 7 days stale cache
    storage: {
      type: 'memory',
    },
  }).define('getTagCategories', getTagCategories({ dbConnection }));

  const serializedMap = new Map<string, { json: string; etag: string; dataRef: unknown }>();

  return async (languageCode: string): Promise<{ json: string; etag: string }> => {
    const startTime = Date.now();

    const CACHE_INVALIDATION_TIMESTAMP = '20240319-tag-categories-cache';
    const cacheKey = JSON.stringify({ languageCode, _cacheInvalidation: CACHE_INVALIDATION_TIMESTAMP });

    const result = await cache.getTagCategories(cacheKey);

    const totalTime = Date.now() - startTime;
    if (totalTime > 500) {
      // eslint-disable-next-line no-console
      console.warn(`SLOW QUERY (${totalTime}ms): getCachedClientTagCategories(${languageCode})`);
    }

    const cached = serializedMap.get(languageCode);

    if (cached && cached.dataRef === result) {
      return { json: cached.json, etag: cached.etag };
    }

    const json = JSON.stringify({ tagCategories: result });
    const etag = `W/"${Buffer.byteLength(json).toString(16)}"`;
    serializedMap.set(languageCode, { json, etag, dataRef: result });

    return { json, etag };
  };
};

export type GetCachedClientTagCategories = ReturnType<typeof createGetCachedClientTagCategories>;
export default createGetCachedClientTagCategories;
