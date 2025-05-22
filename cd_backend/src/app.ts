import fastify, { FastifyBaseLogger } from 'fastify';
import { logger } from './services/logger/logger';
import jwtAuthPlugin from './auth/jwtAuth';
import apiKeyAuthPlugin from './auth/apiKeyAuth';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
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
import { HttpError } from './errors';
import { registerGetNarrativesController } from './http/narratives/getNarratives.ctrl';
import { registerLanguageControllers } from './http/languages/languages.ctrl';
import { registerSyncFragmentsController } from './http/syncFragments.ctrl';
import fastifySensible from '@fastify/sensible';
import { registerGetClientNarrativesController } from './http/client/getClientNarratives.ctrl';
import { registerGetClientFragmentsController } from './http/client/getClientFragments.ctrl';
import { registerCreatePersonController } from './http/persons/createPerson.ctrl';
import { registerUpdatePersonController } from './http/persons/updatePerson.ctrl';
import { registerGetPersonsController } from './http/persons/getPersons.ctrl';
import { registerDeletePersonController } from './http/persons/deletePerson.ctrl';
import { registerFindPersonController } from './http/persons/findPerson.ctrl';
import { registerGetLanguagesController } from './http/languages/getLanguages.ctrl';
import { registerDeleteDuplicateCaptionsController } from './http/deleteDuplicateCaptions.ctrl';
import createGetCachedClientNarratives from './domain/narratives/getCachedClientNarratives';
import createGetCachedClientFragments from './domain/fragments/getCachedClientFragments';
import rateLimit from '@fastify/rate-limit';
import { registerTagCategoryControllers } from './http/tag-categories/tag-categories.ctrl';
import { registerGetClientTagCategoriesController } from './http/client/getClientTagCategories.ctrl';
import { getCachedClientTagCategories } from './domain/tagCategories/getCachedClientTagCategories';

export type AppDeps = {
  dbConnection: DataSource;
  bunnyStream: BunnyStreamApiClient;
};

export async function setupApp({ dbConnection, bunnyStream }: AppDeps) {
  const app = fastify({
    loggerInstance: logger as FastifyBaseLogger,
  });

  const getCachedClientNarratives = createGetCachedClientNarratives({ dbConnection });
  const getCachedClientFragments = createGetCachedClientFragments({ dbConnection });

  // Add security headers using helmet
  await app.register(helmet, {
    // Configure helmet options based on your requirements
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'validator.swagger.io'],
        connectSrc: ["'self'"],
      },
    },
  });

  // Add rate limiter to protect against brute force attacks
  await app.register(rateLimit, {
    max: 100, // Maximum 100 requests per windowMs
    timeWindow: '1 minute', // Per minute
    // Whitelist legitimate origins if needed
    allowList: (req: { headers: { origin?: string } }) => {
      const origin = req.headers.origin;
      return !!(origin && [ENV.CMS_URL, ENV.CLIENT_URL].includes(origin));
    },
  });

  await app.register(cors, {
    origin: [ENV.CMS_URL, ENV.CLIENT_URL],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key'],
  });

  app.setErrorHandler((error, request, reply) => {
    app.log.error(error);
    const statusCode = error instanceof HttpError ? error.statusCode : 500;
    // Don't reveal detailed error messages to clients
    const message = statusCode === 500 ? 'Internal Server Error' : error.message;
    reply.status(statusCode).send({ ok: false, error: message });
  });

  app.get('/health', async () => ({ status: 'ok' }));

  await app.register(fastifySensible);

  await app.register(async (app) => {
    await app.register(jwtAuthPlugin);
    app.addHook('onRequest', app.authenticateJwt);
    registerGetNarrativesController(app)({ dbConnection });
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
    registerTagCategoryControllers(app)({ dbConnection });
    registerCountryControllers(app)({ dbConnection });
    registerGetFragmentsController(app)({ dbConnection });
    registerLanguageControllers(app)({ dbConnection });
  });

  await app.register(async (app) => {
    await app.register(apiKeyAuthPlugin);
    app.addHook('onRequest', app.authenticateApiKey);
    registerGetClientNarrativesController(app)({ getCachedClientNarratives });
    registerGetClientFragmentsController(app)({ getCachedClientFragments });
    registerGetClientTagCategoriesController(app)({ getCachedClientTagCategories });

    registerSyncFragmentsController(app)({ dbConnection, bunnyStream });
    registerDeleteDuplicateCaptionsController(app)({ bunnyStream });
  });

  await app.register(async (app) => {
    await app.register(jwtAuthPlugin);
    await app.register(apiKeyAuthPlugin);
    app.addHook('onRequest', app.authenticateApiKey);
    registerGetLanguagesController(app)({ dbConnection });
  });

  // Add a catch-all 404 handler for non-existent routes
  app.setNotFoundHandler((request, reply) => {
    // Log the not found route with minimal information to avoid log bloat
    app.log.info(
      {
        method: request.method,
        url: request.url,
        host: request.headers.host,
        remoteAddress: request.ip,
      },
      `Route ${request.method}:${request.url} not found`
    );

    // Return a generic 404 without exposing route details
    reply.status(404).send({
      ok: false,
      error: 'Not Found',
    });
  });

  return app;
}
