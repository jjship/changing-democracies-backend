import { FastifyInstance } from 'fastify';
import { Type, TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import { ENV } from '../../env';

export const registerGetVideoCaptionsController = (app: FastifyInstance) => () => {
  app.withTypeProvider<TypeBoxTypeProvider>().route({
    method: 'GET',
    url: '/videos/:id/captions/:srclang',
    schema: {
      params: Type.Object({ id: Type.String(), srclang: Type.String() }),
    },
    handler: async (req, res) => {
      const { id, srclang } = req.params;

      // Captions are served as static .vtt files from the Bunny CDN pull zone.
      const url = `https://${ENV.BUNNY_STREAM_PULL_ZONE}.b-cdn.net/${id}/captions/${srclang}.vtt`;
      const response = await fetch(url, { method: 'GET' });

      if (response.status === 404) {
        return res.status(404).send({ ok: false, error: 'Captions not found' });
      }
      if (!response.ok) {
        return res.status(502).send({ ok: false, error: 'Failed to fetch captions' });
      }

      const vtt = await response.text();
      return res.status(200).send({ vtt });
    },
  });
};
