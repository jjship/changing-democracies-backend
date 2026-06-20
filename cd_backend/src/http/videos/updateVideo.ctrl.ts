import { FastifyInstance } from 'fastify';
import { Type, TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import { BunnyStreamApiClient } from '../../services/bunnyStream/bunnyStreamApiClient';

export const registerUpdateVideoController =
  (app: FastifyInstance) =>
  ({ bunnyStream }: { bunnyStream: BunnyStreamApiClient }) => {
    app.withTypeProvider<TypeBoxTypeProvider>().route({
      method: 'PATCH',
      url: '/videos/:id',
      schema: {
        params: Type.Object({ id: Type.String() }),
        body: Type.Object({
          title: Type.Optional(Type.String()),
          tags: Type.Optional(Type.String()),
        }),
      },
      handler: async (req, res) => {
        const { id } = req.params;
        const { title, tags } = req.body;

        // Tags are managed in their own panel; only touch metaTags when `tags` is
        // explicitly provided. Omitting it leaves Bunny's existing metaTags intact
        // (passing [] would wipe them).
        const metaTags = tags !== undefined ? [{ property: 'tags', value: tags.toUpperCase() }] : undefined;

        const video = await bunnyStream.updateVideo({ videoId: id, title, metaTags });
        return res.status(200).send(video);
      },
    });
  };
