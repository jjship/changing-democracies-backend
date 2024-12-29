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

export const createVideosApi =
  ({ axios, logger }: { axios: AxiosInstance; logger: FastifyBaseLogger }) =>
  ({ collectionId }: { collectionId: string }) => ({
    async getVideos() {
      try {
        const res = await axios.get<BunnyVideo[]>(`/videos?collectionId=${collectionId}`);

        return res.data;
      } catch (err) {
        logger.error({ err }, 'Error while fetching videos.');
        throw err;
      }
    },
  });
