import { Type, TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import { FastifyInstance } from 'fastify';
import { DataSource } from 'typeorm';
import { NarrativeEntity } from '../../db/entities/Narrative';
import { NarrativeFragmentEntity } from '../../db/entities/NarrativeFragment';
import { requireApiKey } from '../../auth/apiKeyAuth';

export const registerGetClientNarrativesController =
  (app: FastifyInstance) =>
  ({ dbConnection }: { dbConnection: DataSource }) => {
    app.withTypeProvider<TypeBoxTypeProvider>().route({
      method: 'POST',
      url: '/client-narratives',
      preHandler: [requireApiKey('read:client-protected')],
      schema: getClientNarrativesSchema(),
      handler: async (req, res) => {
        const languageCode = req.body.languageCode.toUpperCase();
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

        const clientNarratives = await Promise.all(
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

        return res.status(200).send(clientNarratives);
      },
    });
  };

function getClientNarrativesSchema() {
  return {
    description: 'Get client narratives filtered by language.',
    tags: ['narratives'],
    body: Type.Object({
      languageCode: Type.String({ minLength: 2, maxLength: 2 }),
    }),
    response: {
      200: Type.Array(
        Type.Object({
          id: Type.String(),
          title: Type.String(),
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
              country: Type.Optional(Type.String()),
              sequence: Type.Number(),
              otherPaths: Type.Array(
                Type.Object({
                  id: Type.String(),
                  title: Type.String(),
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
