import { FastifyInstance } from 'fastify';
import { requireApiKey } from '../../auth/apiKeyAuth';
import { ENV } from '../../env';

export const registerDeletePosterController = (app: FastifyInstance) => () => {
  app.route({
    method: 'DELETE',
    url: '/photobooth/posters/:fileName',
    preHandler: [requireApiKey('write:photobooth')],
    handler: async (req, res) => {
      const { fileName } = req.params as { fileName: string };

      // Purge CDN cache first
      const purgeUrl = `https://api.bunny.net/purge?url=https%3A%2F%2F${ENV.BUNNY_STORAGE_PULL_ZONE}.b-cdn.net%2Fposters%2F${fileName}&async=false`;
      const purgeResponse = await fetch(purgeUrl, {
        method: 'POST',
        headers: {
          AccessKey: ENV.BUNNY_ADMIN_API_KEY,
        },
      });

      if (!purgeResponse.ok) {
        req.log.warn(`Failed to purge CDN cache for ${fileName}`);
      }

      // Delete from storage
      const deleteUrl = `https://storage.bunnycdn.com/${ENV.BUNNY_STORAGE_NAME}/posters/${fileName}`;
      const deleteResponse = await fetch(deleteUrl, {
        method: 'DELETE',
        headers: {
          AccessKey: ENV.BUNNY_STORAGE_API_KEY,
        },
      });

      if (!deleteResponse.ok) {
        return res.status(502).send({ ok: false, error: 'Failed to delete poster' });
      }

      return res.status(200).send({ ok: true });
    },
  });
};
