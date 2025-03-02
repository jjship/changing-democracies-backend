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

// Helper function to determine if an error is a connection-related error
const isConnectionError = (error: any): boolean => {
  if (error?.code) {
    return ['ECONNABORTED', 'ETIMEDOUT', 'ECONNRESET', 'ECONNREFUSED', 'EAI_AGAIN'].includes(error.code);
  }
  return false;
};

export const createVideosApi =
  ({ axios, logger }: { axios: AxiosInstance; logger: FastifyBaseLogger }) =>
  ({ collectionId }: { collectionId: string }) => ({
    async deleteVideoCaptions({ videoId, srclang }: { videoId: string; srclang: string }) {
      const maxRetries = 3;
      let retryCount = 0;

      while (retryCount < maxRetries) {
        try {
          await axios.delete(`/videos/${videoId}/captions/${srclang}`, {
            // Add timeout to prevent hanging requests
            timeout: 10000,
          });
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

          logger.error({ err, videoId, srclang, retryAttempts: retryCount }, 'Error while deleting video captions.');
          throw err;
        }
      }
    },

    async getVideos() {
      const maxRetries = 3;
      const maxPageRetries = 2;
      let allVideos: BunnyVideo[] = [];

      try {
        let currentPage = 1;
        let totalItems: number | null = null;
        const itemsPerPage = 100;

        do {
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
                // Add timeout to prevent hanging requests
                timeout: 15000,
              });

              const { items, totalItems: fetchedTotalItems } = res.data;
              allVideos = [...allVideos, ...items];

              if (totalItems === null) {
                totalItems = fetchedTotalItems;
              }

              pageSuccess = true;
              currentPage++;
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
                'Error while fetching videos page.'
              );
              throw err;
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
        } while (totalItems && allVideos.length < totalItems);

        return allVideos;
      } catch (err) {
        logger.error({ err }, 'Error while fetching videos.');
        throw err;
      }
    },
  });
