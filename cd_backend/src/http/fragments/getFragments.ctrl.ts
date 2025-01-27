import { Type, TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import { FastifyInstance } from 'fastify';
import { DataSource } from 'typeorm';
import { fragmentSchema } from './fragment.schema';
import { getFragments } from '../../domain/fragments/fragments.api';

export const registerGetFragmentsController =
  (app: FastifyInstance) =>
  ({ dbConnection }: { dbConnection: DataSource }) => {
    app.withTypeProvider<TypeBoxTypeProvider>().route({
      method: 'GET',
      url: '/fragments',
      schema: getFragmentsSchema(),
      handler: async (req, reply) => {
        const { personIds } = req.query;

        const fragments = await getFragments({ dbConnection, personIds });

        return reply.status(200).send({
          data: fragments,
        });
      },
    });

    function getFragmentsSchema() {
      return {
        description: 'Get all video fragments',
        tags: ['fragments'] as string[],
        querystring: Type.Object({
          personIds: Type.Optional(Type.Array(Type.String())),
        }),
        response: {
          200: Type.Object({
            data: Type.Array(
              Type.Object({
                id: Type.String(),
                type: Type.Literal('fragment'),
                attributes: fragmentSchema,
              })
            ),
          }),
        },
      };
    }
  };
