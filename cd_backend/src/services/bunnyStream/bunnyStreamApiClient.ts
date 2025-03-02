import axios, { AxiosError } from 'axios';
import axiosRetry, { IAxiosRetryConfig } from 'axios-retry';
import { FastifyBaseLogger } from 'fastify';
import { Agent } from 'https';
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
    retry = { retries: 3, shouldResetTimeout: true, retryCondition: shouldRetry },
  }: {
    baseUrl: string;
    apiKey: string;
    libraryId: string;
    collectionId: string;
    retry?: IAxiosRetryConfig;
  }) => {
    const serviceLogger = logger.child({ serviceName: 'bunny_stream' });

    // Create a more conservative HTTPS agent with fewer sockets to prevent memory leaks
    const httpsAgent = new Agent({
      keepAlive: true,
      // Reduce maximum sockets to prevent too many concurrent connections
      maxSockets: 25, // Down from 100
      maxFreeSockets: 5, // Down from 10
      timeout: 30_000, // Reduced from 60_000
      // Add these options to help with memory management
      maxCachedSessions: 10,
    });

    const bunnyAxios = axios.create({
      baseURL: `${baseUrl}/library/${libraryId}`,
      httpsAgent,
      headers: {
        accept: 'application/json',
        AccessKey: apiKey,
      },
      // Add global timeout to prevent hanging requests
      timeout: 30000,
      // Disable large data responses
      maxContentLength: 10 * 1024 * 1024, // 10MB max response size
      decompress: true, // Handle gzip/deflate automatically
    });

    axiosRetry(bunnyAxios, retry);

    // Add response interceptor to clean up large responses
    bunnyAxios.interceptors.response.use(
      (response) => {
        // If response includes large arrays, we can limit their size here
        if (
          response.data &&
          response.data.items &&
          Array.isArray(response.data.items) &&
          response.data.items.length > 600
        ) {
          serviceLogger.warn(
            {
              originalLength: response.data.items.length,
            },
            'Limiting large response array to prevent memory issues'
          );

          // Only keep the first 600 items to prevent memory issues
          response.data.items = response.data.items.slice(0, 600);
        }
        return response;
      },
      (error) => Promise.reject(error)
    );

    // Setup automatic cleanup
    setInterval(() => {
      // Force garbage collection hints
      if (global.gc) {
        try {
          global.gc();
          serviceLogger.debug('Manual garbage collection triggered');
        } catch (err) {
          serviceLogger.error({ err }, 'Error during manual garbage collection');
        }
      }
    }, 60000); // Run every minute

    return createVideosApi({ axios: bunnyAxios, logger: serviceLogger })({ collectionId });
  };

const shouldRetry: (error: AxiosError) => boolean = (err) => axiosRetry.isNetworkOrIdempotentRequestError(err);
