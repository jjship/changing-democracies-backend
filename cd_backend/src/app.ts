import fastify, { FastifyBaseLogger } from 'fastify';
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import { logger } from './services/logger/logger';
import { authMiddleware } from './http/middleware/auth';
import { syncFragments } from './domain/fragments/fragments.api';
import { registerGetFragmentsController } from './http/fragments/getFragments.ctrl';
import { registerCreateNarrativeController } from './http/narratives/createNarrative.ctrl';
import { BunnyStreamApiClient } from './services/bunnyStream/bunnyStreamApiClient';
import { DataSource } from 'typeorm';
import { registerUpdateFragmentsController } from './http/fragments/updateFragments.ctrl';
import { registerUpdateNarrativeController } from './http/narratives/updateNarrative.ctrl';
import { registerDeleteNarrativeController } from './http/narratives/deleteNarrative.ctrl';

export type AppDeps = {
  dbConnection: DataSource;
  bunnyStream: BunnyStreamApiClient;
};

export async function setupApp({ dbConnection, bunnyStream }: AppDeps) {
  const app = fastify({
    loggerInstance: logger as FastifyBaseLogger,
  }).withTypeProvider<TypeBoxTypeProvider>();

  registerGetFragmentsController(app)({ dbConnection });
  registerUpdateFragmentsController(app)({ dbConnection });
  registerCreateNarrativeController(app)({ dbConnection });
  registerUpdateNarrativeController(app)({ dbConnection });
  registerDeleteNarrativeController(app)({ dbConnection });
  await syncFragments({ dbConnection, bunnyStream, logger: logger.child({ module: 'setup-app' }) });

  app.addHook('onRequest', authMiddleware);

  app.get('/health', { config: { auth: false } }, async () => ({ status: 'ok' }));

  return app;
}
