import { Type, TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import { FastifyInstance } from 'fastify';
import { DataSource } from 'typeorm';
import { narrativeSchema } from './narrative.schema';
import { NarrativeEntity } from '../../db/entities/Narrative';
import { parseNarrativeEntity } from '../../domain/narratives/narratives.api';

export const registerGetNarrativesController =
  (app: FastifyInstance) =>
  ({ dbConnection }: { dbConnection: DataSource }) => {
    app.withTypeProvider<TypeBoxTypeProvider>().route({
      method: 'GET',
      url: '/narratives',
      schema: {
        description: 'Get all narratives.',
        tags: ['narratives'],
        response: {
          200: Type.Array(
            Type.Object({
              type: Type.Literal('narrative'),
              id: Type.String(),
              attributes: narrativeSchema,
            })
          ),
        },
      },
      handler: async (req, res) => {
        const narratives = await dbConnection.getRepository(NarrativeEntity).find({
          relations: [
            'names',
            'names.language',
            'descriptions',
            'descriptions.language',
            'narrativeFragments',
            'narrativeFragments.fragment',
          ],
        });

        return res.status(200).send(narratives.map(parseNarrativeEntity));
      },
    });
  };
