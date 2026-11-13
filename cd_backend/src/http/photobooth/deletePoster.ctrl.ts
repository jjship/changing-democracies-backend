import { Type, TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import { FastifyInstance } from 'fastify';
import { requireApiKey } from '../../auth/apiKeyAuth';
import { ENV } from '../../env';
import { POSTER_FILE_NAME_PATTERN } from './posterFileName';

export const registerDeletePosterController = (app: FastifyInstance) => () => {
  app.withTypeProvider<TypeBoxTypeProvider>().route({
    method: 'DELETE',
    url: '/photobooth/posters/:fileName',
    preHandler: [requireApiKey('write:photobooth')],
    schema: {
      params: Type.Object({ fileName: Type.String({ pattern: POSTER_FILE_NAME_PATTERN, maxLength: 255 }) }),
    },
    handler: async (req, res) => {
      const { fileName } = req.params;

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
