import { Type, TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import { FastifyInstance } from 'fastify';
import { requireApiKey } from '../../auth/apiKeyAuth';
import { GetCachedClientFragments } from '../../domain/fragments/getCachedClientFragments';

export const registerGetClientFragmentsController =
  (app: FastifyInstance) =>
  ({ getCachedClientFragments }: { getCachedClientFragments: GetCachedClientFragments }) => {
    app.withTypeProvider<TypeBoxTypeProvider>().route({
      method: 'GET',
      url: '/client-fragments',
      preHandler: [requireApiKey('read:client-protected')],
      schema: getClientFragmentsSchema(),
      handler: async (req, res) => {
        const {
          languageCode = 'en',
          page = 1,
          limit = 500,
        } = req.query as {
          languageCode?: string;
          page?: number;
          limit?: number;
        };

        // Validate limit doesn't exceed maximum
        const validatedLimit = Math.min(limit, 500);
        const validatedPage = Math.max(page, 1);

        const clientFragments = await getCachedClientFragments({
          languageCode,
          page: validatedPage,
          limit: validatedLimit,
        });

        // Add cache headers to improve client-side caching
        res.header('Cache-Control', 'public, max-age=600, stale-while-revalidate=3600');
        res.header('Vary', 'Accept-Encoding, Accept-Language');

        // Generate ETag for efficient caching
        const etag = `W/"${Buffer.from(JSON.stringify(clientFragments)).length.toString(16)}"`;
        res.header('ETag', etag);

        // Check if client has a fresh copy (304 Not Modified)
        const ifNoneMatch = req.headers['if-none-match'];
        if (ifNoneMatch === etag) {
          return res.status(304).send();
        }

        return res.status(200).send(clientFragments);
      },
    });
  };

function getClientFragmentsSchema() {
  return {
    description: 'Get client fragments with language-specific content',
    tags: ['fragments'],
    querystring: Type.Object({
      languageCode: Type.Optional(Type.String({ minLength: 2, maxLength: 2 })),
      page: Type.Optional(Type.Number({ minimum: 1 })),
      limit: Type.Optional(Type.Number({ minimum: 1, maximum: 500 })),
    }),
    response: {
      200: Type.Object({
        data: Type.Array(
          Type.Object({
            id: Type.String(),
            title: Type.String(),
            duration: Type.Number(),
            playerUrl: Type.String(),
            thumbnailUrl: Type.String(),
            person: Type.Union([
              Type.Object({
                id: Type.String(),
                name: Type.String(),
                bio: Type.String(),
                country: Type.Object({
                  code: Type.String(),
                  name: Type.String(),
                }),
              }),
              Type.Null(),
            ]),
            tags: Type.Array(
              Type.Object({
                id: Type.String(),
                name: Type.String(),
              })
            ),
          })
        ),
        pagination: Type.Object({
          total: Type.Number(),
          page: Type.Number(),
          limit: Type.Number(),
          pages: Type.Number(),
        }),
      }),
    },
  };
}
