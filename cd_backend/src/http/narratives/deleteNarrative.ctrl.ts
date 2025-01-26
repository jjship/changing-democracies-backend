import { Type, TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import { FastifyInstance } from 'fastify';
import { DataSource } from 'typeorm';
import { NarrativeEntity } from '../../db/entities/Narrative';
import { NotFoundError } from '../../errors';

export const registerDeleteNarrativeController =
  (app: FastifyInstance) =>
  ({ dbConnection }: { dbConnection: DataSource }) => {
    app.withTypeProvider<TypeBoxTypeProvider>().route({
      method: 'DELETE',
      url: '/narratives/:id',
      schema: deleteNarrativeSchema(),
      handler: async (req, res) => {
        await dbConnection.transaction(async (entityManager) => {
          const narrativeRepo = entityManager.getRepository(NarrativeEntity);

          const existingNarrative = await narrativeRepo.findOne({
            where: { id: req.params.id },
            relations: ['descriptions', 'names', 'narrativeFragments'],
          });

          if (!existingNarrative) {
            throw new NotFoundError(`Narrative with id '${req.params.id}' not found`);
          }

          // Remove related entities first
          if (existingNarrative.descriptions?.length) {
            await entityManager.remove(existingNarrative.descriptions);
          }

          if (existingNarrative.names?.length) {
            await entityManager.remove(existingNarrative.names);
          }

          if (existingNarrative.narrativeFragments?.length) {
            await entityManager.remove(existingNarrative.narrativeFragments);
          }

          // Finally remove the narrative itself
          await entityManager.remove(existingNarrative);
        });

        return res.status(204).send();
      },
    });
  };

function deleteNarrativeSchema() {
  return {
    description: 'Delete existing narrative.',
    tags: ['narratives'] as string[],
    params: Type.Object({
      id: Type.String(),
    }),
    response: {
      204: Type.Null(),
    },
  };
}
