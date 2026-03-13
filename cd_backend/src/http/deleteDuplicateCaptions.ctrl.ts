import { FastifyInstance } from 'fastify';
import { Type, TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import { BunnyStreamApiClient } from '../services/bunnyStream/bunnyStreamApiClient';
import { requireApiKey } from '../auth/requireApiKey';
import { deleteDuplicateCaptions } from '../domain/fragments/deleteDuplicateCaptions';

export const registerDeleteDuplicateCaptionsController =
  (app: FastifyInstance) =>
  ({ bunnyStream }: { bunnyStream: BunnyStreamApiClient }) => {
    app.withTypeProvider<TypeBoxTypeProvider>().route({
      method: 'POST',
      url: '/delete-duplicate-captions',
      schema: {
        body: Type.Object({
          dryRun: Type.Boolean({ default: true }),
        }),
      },
      preHandler: [requireApiKey('write:github-protected')],
      handler: async (request, reply) => {
        const deletedCaptions = await deleteDuplicateCaptions({
          bunnyStream,
          logger: request.log,
          dryRun: request.body.dryRun,
        });

        return reply.status(200).send({
          message: request.body.dryRun ? 'Dry run completed' : 'Captions deleted successfully',
          deletedCaptions,
        });
      },
    });
  };
