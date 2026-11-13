import fastify, { FastifyBaseLogger } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import multipart from '@fastify/multipart';
import cookie from '@fastify/cookie';
import { DataSource } from 'typeorm';
import rateLimit from '@fastify/rate-limit';
import { logger } from './services/logger/logger';
import sessionAuthPlugin from './auth/sessionAuth';
import apiKeyAuthPlugin from './auth/apiKeyAuth';
import { registerGetFragmentsController } from './http/fragments/getFragments.ctrl';
import { registerCreateNarrativeController } from './http/narratives/createNarrative.ctrl';
import { BunnyStreamApiClient } from './services/bunnyStream/bunnyStreamApiClient';
import { Mailer } from './services/mailer/mailer';
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
import { registerTagCategoryControllers } from './http/tag-categories/tagCategories.ctrl';
import { registerGetClientTagCategoriesController } from './http/client/getClientTagCategories.ctrl';
import createGetCachedClientTagCategories from './domain/tagCategories/getCachedClientTagCategories';
import { registerListVideosController } from './http/videos/listVideos.ctrl';
import { registerGetVideoCaptionsController } from './http/videos/getVideoCaptions.ctrl';
import { registerUpdateVideoController } from './http/videos/updateVideo.ctrl';
import { registerUploadCaptionsController } from './http/videos/uploadCaptions.ctrl';
import { registerUploadPosterController } from './http/photobooth/uploadPoster.ctrl';
import { registerListPostersController } from './http/photobooth/listPosters.ctrl';
import { registerDeletePosterController } from './http/photobooth/deletePoster.ctrl';
import { registerSendPosterEmailController } from './http/photobooth/sendPosterEmail.ctrl';
import { registerSignInController } from './http/auth/signIn.ctrl';
import { registerSignOutController } from './http/auth/signOut.ctrl';
import { registerGetSessionController } from './http/auth/getSession.ctrl';
import { registerRequestPasswordResetController } from './http/auth/requestPasswordReset.ctrl';
import { registerResetPasswordController } from './http/auth/resetPassword.ctrl';
import { registerAdminUsersControllers } from './http/auth/adminUsers.ctrl';

export type AppDeps = {
  dbConnection: DataSource;
  bunnyStream: BunnyStreamApiClient;
  mailer: Mailer;
};

export async function setupApp({ dbConnection, bunnyStream, mailer }: AppDeps) {
  const app = fastify({
    loggerInstance: logger as FastifyBaseLogger,
    // behind the host reverse proxy
    trustProxy: true,
  });

  const getCachedClientNarratives = createGetCachedClientNarratives({ dbConnection });
  const getCachedClientFragments = createGetCachedClientFragments({ dbConnection });
  const getCachedClientTagCategories = createGetCachedClientTagCategories({ dbConnection });

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
    credentials: true,
  });

  await app.register(cookie);

  await app.register(sessionAuthPlugin, { dbConnection });

  app.setErrorHandler((error, request, reply) => {
    // Handle known HTTP errors
    if (error instanceof HttpError) {
      request.log.warn({ statusCode: error.statusCode, url: request.url }, error.message);
      return reply.status(error.statusCode).send({ ok: false, error: error.message });
    }

    // Fastify's own 4xx (validation, rate limit, bad JSON)
    const statusCode = (error as { statusCode?: unknown }).statusCode;
    if (typeof statusCode === 'number' && statusCode >= 400 && statusCode < 500) {
      const message = error instanceof Error ? error.message : 'Request failed';
      request.log.warn({ statusCode, url: request.url }, message);
      return reply.status(statusCode).send({ ok: false, error: message });
    }

    app.log.error(error);

    // Handle database errors
    if (error instanceof Error && error.name === 'QueryFailedError') {
      // For duplicate key violations, return 409
      if (error.message.includes('duplicate key')) {
        return reply.status(409).send({ ok: false, error: 'Resource already exists' });
      }
      // For invalid UUIDs, return 404
      if (error.message.includes('invalid input syntax for type uuid')) {
        return reply.status(404).send({ ok: false, error: 'Resource not found' });
      }
    }

    // Handle unknown errors
    reply.status(500).send({ ok: false, error: 'Internal Server Error' });
  });

  await app.register(multipart);

  // eslint-disable-next-line @typescript-eslint/require-await
  app.get('/health', async () => ({ status: 'ok' }));

  // public auth
  // eslint-disable-next-line @typescript-eslint/require-await
  await app.register(async (app) => {
    registerSignInController(app)({ dbConnection });
    registerSignOutController(app)({ dbConnection });
    registerRequestPasswordResetController(app)({ dbConnection, mailer });
    registerResetPasswordController(app)({ dbConnection });
  });

  // CMS: admin session required
  // eslint-disable-next-line @typescript-eslint/require-await
  await app.register(async (app) => {
    app.addHook('onRequest', app.authenticateSession);

    registerGetSessionController(app)();
    registerAdminUsersControllers(app)({ dbConnection, mailer });

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

    registerListVideosController(app)({ bunnyStream });
    registerGetVideoCaptionsController(app)();
    registerUpdateVideoController(app)({ bunnyStream });
    registerUploadCaptionsController(app)({ bunnyStream });
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
    await app.register(apiKeyAuthPlugin);
    app.addHook('onRequest', app.authenticateApiKey);
    registerGetLanguagesController(app)({ dbConnection });
  });

  await app.register(async (app) => {
    await app.register(apiKeyAuthPlugin);
    app.addHook('onRequest', app.authenticateApiKey);
    registerUploadPosterController(app)();
    registerListPostersController(app)();
    registerDeletePosterController(app)();
    registerSendPosterEmailController(app)();
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
      `Route ${request.method}:${request.url} not found`,
    );

    // Return 500 for non-existent routes to avoid revealing route existence
    reply.status(500).send({
      ok: false,
      error: 'Internal Server Error',
    });
  });

  return app;
}
