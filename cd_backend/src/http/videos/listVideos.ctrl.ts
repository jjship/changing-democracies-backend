import { FastifyInstance } from 'fastify';
import { BunnyStreamApiClient } from '../../services/bunnyStream/bunnyStreamApiClient';

export const registerListVideosController =
  (app: FastifyInstance) =>
  ({ bunnyStream }: { bunnyStream: BunnyStreamApiClient }) => {
    app.route({
      method: 'GET',
      url: '/videos',
      handler: async (_req, res) => {
        const videos = await bunnyStream.getVideos();
        return res.status(200).send(videos);
      },
    });
  };
