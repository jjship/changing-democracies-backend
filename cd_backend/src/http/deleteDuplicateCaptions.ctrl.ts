import { FastifyInstance } from 'fastify';
import { syncFragments } from '../domain/fragments/syncFragments';
import { Type, TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import { DataSource } from 'typeorm';
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
        await deleteDuplicateCaptions({ bunnyStream, logger: request.log, dryRun: request.body.dryRun });

        return reply.status(200).send({ message: 'Fragments synced successfully' });
      },
    });
  };
