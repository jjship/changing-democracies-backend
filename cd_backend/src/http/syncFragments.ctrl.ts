import { FastifyInstance } from 'fastify';
import { syncFragments } from '../domain/fragments/syncFragments';
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import { DataSource } from 'typeorm';
import { BunnyStreamApiClient } from '../services/bunnyStream/bunnyStreamApiClient';
import { requireApiKey } from '../auth/requireApiKey';

export const registerSyncFragmentsController =
  (app: FastifyInstance) =>
  ({ dbConnection, bunnyStream }: { dbConnection: DataSource; bunnyStream: BunnyStreamApiClient }) => {
    app.withTypeProvider<TypeBoxTypeProvider>().route({
      method: 'POST',
      url: '/sync-fragments',
      preHandler: [requireApiKey('write:github-protected')],
      handler: async (request, reply) => {
        await syncFragments({ dbConnection, bunnyStream, logger: request.log });

        return reply.status(200).send({ message: 'Fragments synced successfully' });
      },
    });
  };
