import { FastifyInstance } from 'fastify';
import { Type, TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import { BunnyStreamApiClient } from '../../services/bunnyStream/bunnyStreamApiClient';
import { ENV } from '../../env';

export const registerUploadCaptionsController =
  (app: FastifyInstance) =>
  ({ bunnyStream }: { bunnyStream: BunnyStreamApiClient }) => {
    app.withTypeProvider<TypeBoxTypeProvider>().route({
      method: 'PUT',
      url: '/videos/:id/captions/:srclang',
      schema: {
        params: Type.Object({ id: Type.String(), srclang: Type.String() }),
        body: Type.Object({
          label: Type.String(),
          vtt: Type.String(),
        }),
      },
      handler: async (req, res) => {
        const { id, srclang } = req.params;
        const { label, vtt } = req.body;

        // Normalize region-qualified codes (e.g. "en-US" -> "en"), matching the legacy client.
        const normalizedSrclang = srclang.split('-')[0] ?? srclang;
        const captionsBase64 = Buffer.from(vtt).toString('base64');

        await bunnyStream.uploadCaptions({ videoId: id, srclang: normalizedSrclang, label, captionsBase64 });

        // Purge the CDN cache for this video's captions so the new VTT is served immediately.
        const purgeUrl = `https://api.bunny.net/purge?url=https%3A%2F%2F${ENV.BUNNY_STREAM_PULL_ZONE}.b-cdn.net%2F${id}%2Fcaptions%2F%2A&async=false`;
        const purgeResponse = await fetch(purgeUrl, {
          method: 'POST',
          headers: { AccessKey: ENV.BUNNY_ADMIN_API_KEY },
        });

        if (!purgeResponse.ok) {
          req.log.warn(`Failed to purge caption cache for video ${id}`);
        }

        return res.status(200).send({ ok: true });
      },
    });
  };
