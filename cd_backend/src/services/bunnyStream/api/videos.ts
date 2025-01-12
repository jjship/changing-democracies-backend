import { AxiosInstance } from 'axios';
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

export const createVideosApi =
  ({ axios, logger }: { axios: AxiosInstance; logger: FastifyBaseLogger }) =>
  ({ collectionId }: { collectionId: string }) => ({
    async getVideos() {
      try {
        let allVideos: BunnyVideo[] = [];
        let currentPage = 1;
        let totalItems: number | null = null;
        const itemsPerPage = 100;

        do {
          const res = await axios.get<GetVideosResponse>(`/videos`, {
            params: {
              collectionId,
              page: currentPage,
              itemsPerPage,
            },
          });

          const { items, totalItems: fetchedTotalItems } = res.data;

          allVideos = [...allVideos, ...items];

          if (totalItems === null) {
            totalItems = fetchedTotalItems;
          }

          currentPage++;
        } while (totalItems && allVideos.length < totalItems);

        return allVideos;
      } catch (err) {
        logger.error({ err }, 'Error while fetching videos.');
        throw err;
      }
    },
  });
