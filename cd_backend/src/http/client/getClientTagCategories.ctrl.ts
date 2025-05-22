import { Type, TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import { FastifyInstance } from 'fastify';
import { requireApiKey } from '../../auth/apiKeyAuth';
import { GetCachedClientTagCategories } from '../../domain/tagCategories/getCachedClientTagCategories';

export const registerGetClientTagCategoriesController =
  (app: FastifyInstance) =>
  ({ getCachedClientTagCategories }: { getCachedClientTagCategories: GetCachedClientTagCategories }) => {
    app.withTypeProvider<TypeBoxTypeProvider>().route({
      method: 'GET',
      url: '/client-tag-categories',
      preHandler: [requireApiKey('read:client-protected')],
      schema: getClientTagCategoriesSchema(),
      handler: async (req, res) => {
        const { languageCode = 'en' } = req.query as {
          languageCode?: string;
        };

        const tagCategories = await getCachedClientTagCategories(languageCode);

        // Add cache headers to improve client-side caching
        res.header('Cache-Control', 'public, max-age=600, stale-while-revalidate=3600');
        res.header('Vary', 'Accept-Encoding, Accept-Language');

        // Generate ETag for efficient caching
        const etag = `W/"${Buffer.from(JSON.stringify(tagCategories)).length.toString(16)}"`;
        res.header('ETag', etag);

        // Check if client has a fresh copy (304 Not Modified)
        const ifNoneMatch = req.headers['if-none-match'];
        if (ifNoneMatch === etag) {
          return res.status(304).send();
        }

        return res.status(200).send({ tagCategories });
      },
    });
  };

function getClientTagCategoriesSchema() {
  return {
    description: 'Get tag categories with their tags in the specified language',
    tags: ['tag-categories'],
    querystring: Type.Object({
      languageCode: Type.Optional(Type.String({ minLength: 2, maxLength: 2 })),
    }),
    response: {
      200: Type.Object({
        tagCategories: Type.Array(
          Type.Object({
            id: Type.String(),
            name: Type.String(),
            tags: Type.Array(
              Type.Object({
                id: Type.String(),
                name: Type.String(),
              })
            ),
          })
        ),
      }),
    },
  };
}
