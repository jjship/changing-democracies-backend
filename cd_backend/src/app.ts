import fastify, { FastifyBaseLogger } from 'fastify';
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import { logger } from './services/logger/logger';
import authPlugin from './plugins/auth';
import { syncFragments } from './domain/fragments/fragments.api';
import cors from '@fastify/cors';
import { registerGetFragmentsController } from './http/fragments/getFragments.ctrl';
import { registerCreateNarrativeController } from './http/narratives/createNarrative.ctrl';
import { BunnyStreamApiClient } from './services/bunnyStream/bunnyStreamApiClient';
import { DataSource } from 'typeorm';
import { registerUpdateFragmentsController } from './http/fragments/updateFragments.ctrl';
import { registerUpdateNarrativeController } from './http/narratives/updateNarrative.ctrl';
import { registerDeleteNarrativeController } from './http/narratives/deleteNarrative.ctrl';
import { registerTagControllers } from './http/tags/tags.ctrl';
import { ENV } from './env';
import { registerPersonControllers } from './http/persons/persons.ctrl';
import { registerCountryControllers } from './http/countries/countries.ctrl';
import { HttpError } from './errors';
import { registerGetNarrativesController } from './http/narratives/getNarratives.ctrl';
import { registerLanguageControllers } from './http/languages/languages.ctrl';
import { registerSyncFragmentsController } from './http/syncFragments.ctrl';

export type AppDeps = {
  dbConnection: DataSource;
  bunnyStream: BunnyStreamApiClient;
};

export async function setupApp({ dbConnection, bunnyStream }: AppDeps) {
  const app = fastify({
    loggerInstance: logger as FastifyBaseLogger,
  });

  await app.register(cors, {
    origin: ENV.CMS_URL,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  app.setErrorHandler((error, request, reply) => {
    app.log.error(error);
    const statusCode = error instanceof HttpError ? error.statusCode : 500;
    reply.status(statusCode).send({ ok: false, error: error.message });
  });

  app.get('/health', async () => ({ status: 'ok' }));

  await app.register(async (app) => {
    await app.register(authPlugin);
    app.addHook('onRequest', async (request, reply) => {
      if (request.url.startsWith('/narratives')) {
        // Allow either JWT or Client API Key for narratives
        try {
          await app.authenticate(request);
        } catch (err) {
          await app.authenticateClientApiKey(request);
        }
      } else if (request.url === '/sync-fragments') {
        // Use GitHub API Key for sync-fragments
        await app.authenticateApiKey(request);
      } else {
        // Default to JWT authentication
        await app.authenticate(request);
      }
    });

    registerUpdateFragmentsController(app)({ dbConnection });
    registerCreateNarrativeController(app)({ dbConnection });
    registerUpdateNarrativeController(app)({ dbConnection });
    registerDeleteNarrativeController(app)({ dbConnection });
    registerGetNarrativesController(app)({ dbConnection });
    registerTagControllers(app)({ dbConnection });
    registerPersonControllers(app)({ dbConnection });
    registerCountryControllers(app)({ dbConnection });
    registerGetFragmentsController(app)({ dbConnection });
    registerLanguageControllers(app)({ dbConnection });
  });

  await app.register(async (app) => {
    await app.register(authPlugin);
    app.addHook('onRequest', app.authenticateApiKey);

    registerSyncFragmentsController(app)({ dbConnection, bunnyStream });
  });

  return app;
}
