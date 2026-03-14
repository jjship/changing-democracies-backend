import { FastifyInstance } from 'fastify';
import { requireApiKey } from '../../auth/apiKeyAuth';
import { ENV } from '../../env';

interface BunnyPoster {
  Guid: string;
  ObjectName: string;
  DateCreated: string;
}

export const registerListPostersController = (app: FastifyInstance) => () => {
  app.route({
    method: 'GET',
    url: '/photobooth/posters',
    preHandler: [requireApiKey('read:photobooth')],
    handler: async (_req, res) => {
      const url = `https://storage.bunnycdn.com/${ENV.BUNNY_STORAGE_NAME}/posters/`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          accept: 'application/json',
          AccessKey: ENV.BUNNY_STORAGE_API_KEY,
        },
      });

      if (!response.ok) {
        return res.status(502).send({ ok: false, error: 'Failed to fetch posters data' });
      }

      const posters: BunnyPoster[] = (await response.json()) as BunnyPoster[];

      const list = posters.map((poster) => ({
        id: poster.Guid,
        fileName: poster.ObjectName,
        createdAt: poster.DateCreated,
      }));

      return res.status(200).send(list);
    },
  });
};
