import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import { Type } from '@sinclair/typebox';
import { FastifyInstance } from 'fastify';
import { DataSource } from 'typeorm';
import { fragmentSchema } from './fragment.schema';
import { getFragments } from '../../domain/fragments/getFragments';

export const registerGetFragmentsController =
  (app: FastifyInstance) =>
  ({ dbConnection }: { dbConnection: DataSource }) => {
    app.withTypeProvider<TypeBoxTypeProvider>().route({
      method: 'GET',
      url: '/fragments',
      schema: getFragmentsSchema(),
      handler: async (req, reply) => {
        const fragmets = await getFragments({ dbConnection, logger: req.log });

        return reply.status(200).send({
          data: fragmets,
        });
      },
    });

    function getFragmentsSchema() {
      return {
        description: 'Get all video fragments',
        tags: ['fragments'] as string[],
        response: {
          200: Type.Object({
            data: Type.Array(fragmentSchema),
          }),
        },
      };
    }
  };
