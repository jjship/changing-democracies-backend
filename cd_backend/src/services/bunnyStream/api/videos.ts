import { AxiosInstance } from 'axios';
import { FastifyBaseLogger } from 'fastify';

const createVideosApi =
  ({ axios, logger }: { axios: AxiosInstance; logger: FastifyBaseLogger }) =>
  ({ collectionId }: { collectionId: string }) => ({
    async getVideos() {
      const response = await axios.get(`/videos?collectionId=${collectionId}`);
    },
  });
