import { Type, TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import { FastifyInstance } from 'fastify';
import { requireApiKey } from '../../auth/apiKeyAuth';
import { GetCachedClientNarratives } from '../../domain/narratives/getCachedClientNarratives';

export const registerGetClientNarrativesController =
  (app: FastifyInstance) =>
  ({ getCachedClientNarratives }: { getCachedClientNarratives: GetCachedClientNarratives }) => {
    app.withTypeProvider<TypeBoxTypeProvider>().route({
      method: 'GET',
      url: '/client-narratives',
      preHandler: [requireApiKey('read:client-protected')],
      schema: getClientNarrativesSchema(),
      handler: async (req, res) => {
        const clientNarratives = await getCachedClientNarratives();
        return res.status(200).send(clientNarratives);
      },
    });
  };

function getClientNarrativesSchema() {
  return {
    description: 'Get all client narratives with all language versions',
    tags: ['narratives'],
    response: {
      200: Type.Array(
        Type.Object({
          id: Type.String(),
          titles: Type.Array(Type.Object({ languageCode: Type.String(), title: Type.String() })),
          descriptions: Type.Array(
            Type.Object({ languageCode: Type.String(), description: Type.Array(Type.String()) })
          ),
          total_length: Type.Number(),
          fragments: Type.Array(
            Type.Object({
              guid: Type.String(),
              title: Type.String(),
              length: Type.Number(),
              person: Type.Optional(Type.String()),
              bios: Type.Array(Type.Object({ languageCode: Type.String(), bio: Type.String() })),
              country: Type.Object({
                code: Type.String(),
                names: Type.Array(Type.Object({ languageCode: Type.String(), name: Type.String() })),
              }),
              sequence: Type.Number(),
              otherPaths: Type.Array(
                Type.Object({
                  id: Type.String(),
                  titles: Type.Array(Type.Object({ languageCode: Type.String(), title: Type.String() })),
                })
              ),
              playerUrl: Type.String(),
              thumbnailUrl: Type.String(),
            })
          ),
        })
      ),
    },
  };
}
