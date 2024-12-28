import axios, { AxiosError } from 'axios';
import axiosRetry, { IAxiosRetryConfig } from 'axios-retry';
import { FastifyBaseLogger } from 'fastify';
import { Agent } from 'https';

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
    retry: IAxiosRetryConfig;
  }) => {
    const serviceLogger = logger.child({ serviceName: 'bunny_stream' });

    const bunnyAxios = axios.create({
      baseURL: `${baseUrl}/library/${libraryId}`,
      httpsAgent: new Agent({
        keepAlive: true,
        maxSockets: 100,
        maxFreeSockets: 10,
        timeout: 60_000,
      }),
      headers: {
        accept: 'application/json',
        AccessKey: apiKey,
      },
    });
  };

const shouldRetry: (error: AxiosError) => boolean = (err) => axiosRetry.isNetworkOrIdempotentRequestError(err);
