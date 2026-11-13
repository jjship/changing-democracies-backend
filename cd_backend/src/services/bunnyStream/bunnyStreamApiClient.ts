import { FastifyBaseLogger } from 'fastify';
import { createFetchClient, RetryOptions } from '../http/fetchClient';
import { createVideosApi } from './api/videos';

export { createBunnyStreamClient, BunnyStreamApiClient };
export { BunnyVideo } from './api/videos';

type BunnyStreamApiClient = ReturnType<ReturnType<typeof createBunnyStreamClient>>;

const createBunnyStreamClient =
  ({ logger }: { logger: FastifyBaseLogger }) =>
  ({
    baseUrl,
    apiKey,
    libraryId,
    collectionId,
    retry,
  }: {
    baseUrl: string;
    apiKey: string;
    libraryId: string;
    collectionId: string;
    retry?: RetryOptions;
  }) => {
    const serviceLogger = logger.child({ serviceName: 'bunny_stream' });

    const http = createFetchClient({
      baseUrl: `${baseUrl}/library/${libraryId}`,
      headers: { accept: 'application/json', AccessKey: apiKey },
      timeoutMs: 30_000,
      retry,
      logger: serviceLogger,
    });

    return createVideosApi({ http, logger: serviceLogger })({ collectionId });
  };
