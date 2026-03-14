import { FastifyInstance } from 'fastify';
import { requireApiKey } from '../../auth/apiKeyAuth';
import { ENV } from '../../env';

export const registerUploadPosterController = (app: FastifyInstance) => () => {
  app.route({
    method: 'PUT',
    url: '/photobooth/posters',
    preHandler: [requireApiKey('write:photobooth')],
    handler: async (req, res) => {
      const data = await req.file();
      if (!data) {
        return res.status(400).send({ ok: false, error: 'No file uploaded' });
      }

      const fileNameField = data.fields.fileName;
      const fileNameValue =
        fileNameField && typeof fileNameField === 'object' && 'value' in fileNameField
          ? (fileNameField as { value: string }).value
          : null;

      if (!fileNameValue) {
        return res.status(400).send({ ok: false, error: 'Missing fileName field' });
      }

      const blob = await data.toBuffer();
      const url = `https://storage.bunnycdn.com/${ENV.BUNNY_STORAGE_NAME}/posters/${fileNameValue}`;

      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          AccessKey: ENV.BUNNY_STORAGE_API_KEY,
          'Content-Type': 'application/octet-stream',
        },
        body: blob,
      });

      if (!response.ok) {
        return res.status(502).send({ ok: false, error: 'Failed to upload image to storage' });
      }

      return res.status(200).send({ ok: true });
    },
  });
};
