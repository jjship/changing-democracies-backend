import fastify, { FastifyBaseLogger } from 'fastify';
import { logger } from './services/logger/logger';
import { DataSource } from 'typeorm';
import { BunnyStreamApiClient } from './services/bunnyStream/bunnyStreamApiClient';
import { registerGetFragmentsController } from './http/fragments/getFragments.ctrl';
import { syncFragments } from './domain/fragments/fragments.api';
import { registerCreateNarrativeController } from './http/narratives/createNarrative.ctrl';

export type AppDeps = {
  dbConnection: DataSource;
  bunnyStream: BunnyStreamApiClient;
};

export async function setupApp({ dbConnection, bunnyStream }: AppDeps) {
  const app = fastify({ loggerInstance: logger as FastifyBaseLogger });

  registerGetFragmentsController(app)({ dbConnection });
  registerCreateNarrativeController(app)({ dbConnection });

  await syncFragments({ dbConnection, bunnyStream, logger: logger.child({ module: 'setup-app' }) });

  return app;
}
