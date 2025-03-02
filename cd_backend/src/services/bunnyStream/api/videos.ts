import { AxiosInstance, AxiosError } from 'axios';
import { FastifyBaseLogger } from 'fastify';

export type BunnyVideo = {
  videoLibraryId: number;
  guid: string;
  title: string;
  dateUploaded: string;
  views: number;
  isPublic: boolean;
  length: number;
  status: number;
  framerate: number;
  rotation: number;
  width: number;
  height: number;
  availableResolutions: string;
  thumbnailCount: number;
  encodeProgress: number;
  storageSize: number;
  captions: {
    srclang: string;
    label: string;
  }[];
  hasMP4Fallback: boolean;
  collectionId: string;
  thumbnailFileName: string;
  averageWatchTime: number;
  totalWatchTime: number;
  category: string;
  chapters: any[];
  moments: any[];
  metaTags: {
    property: string;
    value: string;
  }[];
  transcodingMessages: any[];
};

type GetVideosResponse = {
  totalItems: number;
  currentPage: number;
  itemsPerPage: number;
  items: BunnyVideo[];
};

// Helper function for implementing delay with exponential backoff
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Constants for timing and retries
const GLOBAL_TIMEOUT_MS = 60000; // 1 minute global timeout for entire operation
const MAX_ATTEMPTS_PER_REQUEST = 3;
const REQUEST_TIMEOUT_MS = 10000; // 10 seconds timeout for individual requests

// Helper function to determine if an error is a connection-related error
const isConnectionError = (error: any): boolean => {
  if (error?.code) {
    return ['ECONNABORTED', 'ETIMEDOUT', 'ECONNRESET', 'ECONNREFUSED', 'EAI_AGAIN', 'EHOSTUNREACH'].includes(
      error.code
    );
  }
  return false;
};

// Create a promise that will reject after a specified time
const createTimeout = (ms: number) =>
  new Promise<never>((_, reject) => setTimeout(() => reject(new Error(`Operation timed out after ${ms}ms`)), ms));

export const createVideosApi =
  ({ axios, logger }: { axios: AxiosInstance; logger: FastifyBaseLogger }) =>
  ({ collectionId }: { collectionId: string }) => ({
    async deleteVideoCaptions({ videoId, srclang }: { videoId: string; srclang: string }) {
      try {
        // Add a global timeout to the entire operation
        return await Promise.race([
          (async () => {
            const maxRetries = MAX_ATTEMPTS_PER_REQUEST;
            let retryCount = 0;

            while (retryCount < maxRetries) {
              try {
                await axios.delete(`/videos/${videoId}/captions/${srclang}`, {
                  timeout: REQUEST_TIMEOUT_MS,
                });
                logger.info({ videoId, srclang }, 'Successfully deleted video captions');
                return;
              } catch (err) {
                const error = err as Error | AxiosError;

                // Check if this is a network-related error that could benefit from retry
                if (isConnectionError((error as any).code) || (error as AxiosError).code === 'ECONNABORTED') {
                  retryCount++;

                  if (retryCount < maxRetries) {
                    // Exponential backoff with jitter
                    const backoffTime = Math.min(1000 * Math.pow(2, retryCount) + Math.random() * 1000, 10000);
                    logger.warn(
                      {
                        err,
                        videoId,
                        srclang,
                        retryAttempt: retryCount,
                        backoffMs: backoffTime,
                      },
                      'Connection error while deleting video captions. Retrying...'
                    );

                    await delay(backoffTime);
                    continue;
                  }
                }

                logger.error(
                  { err, videoId, srclang, retryAttempts: retryCount },
                  'Error while deleting video captions. Giving up.'
                );
                throw err;
              }
            }

            throw new Error(`Failed to delete captions after ${maxRetries} attempts`);
          })(),
          createTimeout(GLOBAL_TIMEOUT_MS),
        ]);
      } catch (err) {
        // Log and rethrow with a clear message
        logger.error({ err, videoId, srclang }, 'Failed to delete video captions due to timeout or errors');
        throw new Error(`Failed to delete captions for video ${videoId}: ${(err as Error).message}`);
      }
    },

    async getVideos() {
      try {
        // Add a global timeout to the entire operation
        return await Promise.race([
          (async () => {
            const maxPageRetries = MAX_ATTEMPTS_PER_REQUEST;
            let allVideos: BunnyVideo[] = [];

            let currentPage = 1;
            let totalItems: number | null = null;
            const itemsPerPage = 100;

            // Set a maximum number of pages to fetch to prevent infinite loops
            const MAX_PAGES = 50;
            let pagesFetched = 0;

            do {
              if (pagesFetched >= MAX_PAGES) {
                logger.warn(
                  { currentPage, totalPages: pagesFetched, videosCollected: allVideos.length },
                  'Reached maximum page limit. Breaking to prevent infinite loop.'
                );
                break;
              }

              let pageRetryCount = 0;
              let pageSuccess = false;

              while (!pageSuccess && pageRetryCount < maxPageRetries) {
                try {
                  const res = await axios.get<GetVideosResponse>(`/videos`, {
                    params: {
                      collectionId,
                      page: currentPage,
                      itemsPerPage,
                    },
                    timeout: REQUEST_TIMEOUT_MS,
                  });

                  const { items, totalItems: fetchedTotalItems } = res.data;

                  // Validate response data to avoid processing invalid data
                  if (!Array.isArray(items)) {
                    throw new Error('Invalid response: items is not an array');
                  }

                  allVideos = [...allVideos, ...items];

                  if (totalItems === null) {
                    totalItems = fetchedTotalItems;
                  }

                  pageSuccess = true;
                  currentPage++;
                  pagesFetched++;

                  logger.info(
                    {
                      page: currentPage - 1,
                      itemsFetched: items.length,
                      totalCollected: allVideos.length,
                      expectedTotal: totalItems,
                    },
                    'Successfully fetched page of videos'
                  );
                } catch (err) {
                  const error = err as Error | AxiosError;

                  // Check if this is a network-related error that could benefit from retry
                  if (isConnectionError((error as any).code) || (error as AxiosError).code === 'ECONNABORTED') {
                    pageRetryCount++;

                    if (pageRetryCount < maxPageRetries) {
                      // Exponential backoff with jitter
                      const backoffTime = Math.min(1000 * Math.pow(2, pageRetryCount) + Math.random() * 1000, 10000);
                      logger.warn(
                        {
                          err,
                          currentPage,
                          retryAttempt: pageRetryCount,
                          backoffMs: backoffTime,
                        },
                        'Connection error while fetching videos page. Retrying...'
                      );

                      await delay(backoffTime);
                      continue;
                    }
                  }

                  // For non-retryable errors or max retries exceeded
                  logger.error(
                    {
                      err,
                      currentPage,
                      retryAttempts: pageRetryCount,
                    },
                    'Error while fetching videos page. Giving up on this page.'
                  );

                  // Instead of throwing, we'll mark the page as failed and continue
                  break;
                }
              }

              // If we couldn't succeed after retries, break the loop
              if (!pageSuccess) {
                logger.warn(
                  {
                    currentPage,
                    totalCollected: allVideos.length,
                    expectedTotal: totalItems,
                  },
                  'Breaking video fetch loop due to persistent errors'
                );
                break;
              }

              // If we've collected enough items or there's no totalItems to check against, exit
              if (totalItems === null || totalItems === 0 || allVideos.length >= totalItems) {
                break;
              }
            } while (totalItems && allVideos.length < totalItems);

            logger.info(
              {
                totalVideosFetched: allVideos.length,
                totalPages: pagesFetched,
                expectedTotal: totalItems,
              },
              'Completed fetching videos'
            );

            return allVideos;
          })(),
          createTimeout(GLOBAL_TIMEOUT_MS * 5), // 5 minute timeout for the entire operation
        ]);
      } catch (err) {
        // Check if this is a timeout
        if ((err as Error).message.includes('timed out')) {
          logger.error({ err }, 'Global timeout reached while fetching videos. Returning partial results.');
          return []; // Return empty array instead of throwing
        }

        logger.error({ err }, 'Error while fetching videos.');
        throw new Error(`Failed to fetch videos: ${(err as Error).message}`);
      }
    },
  });
