import fastify, { FastifyBaseLogger } from 'fastify';
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import { logger } from './services/logger/logger';
import jwtAuthPlugin from './auth/jwtAuth';
import apiKeyAuthPlugin from './auth/apiKeyAuth';
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
import { registerCountryControllers } from './http/countries/countries.ctrl';
import { HttpError, UnauthorizedError } from './errors';
import { registerGetNarrativesController } from './http/narratives/getNarratives.ctrl';
import { registerLanguageControllers } from './http/languages/languages.ctrl';
import { registerSyncFragmentsController } from './http/syncFragments.ctrl';
import fastifySensible from '@fastify/sensible';
import { registerGetClientNarrativesController } from './http/narratives/getClientNarratives.ctrl';
import { registerCreatePersonController } from './http/persons/createPerson.ctrl';
import { registerUpdatePersonController } from './http/persons/updatePerson.ctrl';
import { registerGetPersonsController } from './http/persons/getPersons.ctrl';
import { registerDeletePersonController } from './http/persons/deletePerson.ctrl';
import { registerFindPersonController } from './http/persons/findPerson.ctrl';
export type AppDeps = {
  dbConnection: DataSource;
  bunnyStream: BunnyStreamApiClient;
};

export async function setupApp({ dbConnection, bunnyStream }: AppDeps) {
  const app = fastify({
    loggerInstance: logger as FastifyBaseLogger,
  });

  await app.register(cors, {
    origin: [ENV.CMS_URL, ENV.CLIENT_URL],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key'],
  });

  app.setErrorHandler((error, request, reply) => {
    app.log.error(error);
    const statusCode = error instanceof HttpError ? error.statusCode : 500;
    reply.status(statusCode).send({ ok: false, error: error.message });
  });

  app.get('/health', async () => ({ status: 'ok' }));

  await app.register(fastifySensible);

  await app.register(async (app) => {
    await app.register(jwtAuthPlugin);
    app.addHook('onRequest', app.authenticateJwt);

    registerUpdateFragmentsController(app)({ dbConnection });
    registerCreateNarrativeController(app)({ dbConnection });
    registerUpdateNarrativeController(app)({ dbConnection });
    registerDeleteNarrativeController(app)({ dbConnection });

    registerCreatePersonController(app)({ dbConnection });
    registerUpdatePersonController(app)({ dbConnection });
    registerGetPersonsController(app)({ dbConnection });
    registerFindPersonController(app)({ dbConnection });
    registerDeletePersonController(app)({ dbConnection });

    registerTagControllers(app)({ dbConnection });
    registerCountryControllers(app)({ dbConnection });
    registerGetFragmentsController(app)({ dbConnection });
    registerLanguageControllers(app)({ dbConnection });
  });

  await app.register(async (app) => {
    await app.register(apiKeyAuthPlugin);
    app.addHook('onRequest', app.authenticateApiKey);
    registerGetClientNarrativesController(app)({ dbConnection });

    registerSyncFragmentsController(app)({ dbConnection, bunnyStream });
  });

  await app.register(async (app) => {
    await app.register(jwtAuthPlugin);
    await app.register(apiKeyAuthPlugin);
    app.addHook('onRequest', app.authenticateApiKey);

    registerGetNarrativesController(app)({ dbConnection });
  });

  return app;
}
