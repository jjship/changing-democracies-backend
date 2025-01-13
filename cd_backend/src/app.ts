import fastify, { FastifyBaseLogger } from 'fastify';
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import { logger } from './services/logger/logger';
import authPlugin from './plugins/auth';
import { syncFragments } from './domain/fragments/fragments.api';
import { registerGetFragmentsController } from './http/fragments/getFragments.ctrl';
import { registerCreateNarrativeController } from './http/narratives/createNarrative.ctrl';
import { BunnyStreamApiClient } from './services/bunnyStream/bunnyStreamApiClient';
import { DataSource } from 'typeorm';
import { registerUpdateFragmentsController } from './http/fragments/updateFragments.ctrl';
import { registerUpdateNarrativeController } from './http/narratives/updateNarrative.ctrl';
import { registerDeleteNarrativeController } from './http/narratives/deleteNarrative.ctrl';
import { registerTagControllers } from './http/tags/tags.ctrl';

export type AppDeps = {
  dbConnection: DataSource;
  bunnyStream: BunnyStreamApiClient;
};

export async function setupApp({ dbConnection, bunnyStream }: AppDeps) {
  const app = fastify({
    loggerInstance: logger as FastifyBaseLogger,
  }).withTypeProvider<TypeBoxTypeProvider>();

  await app.register(authPlugin);

  const authenticatedApp = app.withTypeProvider<TypeBoxTypeProvider>();
  authenticatedApp.addHook('onRequest', app.authenticate);

  registerGetFragmentsController(authenticatedApp)({ dbConnection });
  registerUpdateFragmentsController(authenticatedApp)({ dbConnection });
  registerCreateNarrativeController(authenticatedApp)({ dbConnection });
  registerUpdateNarrativeController(authenticatedApp)({ dbConnection });
  registerDeleteNarrativeController(authenticatedApp)({ dbConnection });
  registerTagControllers(authenticatedApp)({ dbConnection });

  await syncFragments({ dbConnection, bunnyStream, logger: logger.child({ module: 'setup-app' }) });

  app.get('/health', async () => ({ status: 'ok' }));

  return app;
}
