import { Type, TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import { FastifyInstance } from 'fastify';
import { Resend } from 'resend';
import { requireApiKey } from '../../auth/apiKeyAuth';
import { ENV } from '../../env';

const ALLOWED_HOSTS = ['b-cdn.net', 'bunnycdn.com', 'changingdemocracies.eu'];

function isAllowedUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ALLOWED_HOSTS.some(
      (host) => parsed.hostname === host || parsed.hostname.endsWith(`.${host}`),
    );
  } catch {
    return false;
  }
}

export const registerSendPosterEmailController = (app: FastifyInstance) => () => {
  app.withTypeProvider<TypeBoxTypeProvider>().route({
    method: 'POST',
    url: '/photobooth/posters/send-email',
    preHandler: [requireApiKey('write:photobooth')],
    schema: {
      body: Type.Object({
        imageUrl: Type.String({ format: 'uri' }),
        fileName: Type.String({ minLength: 1 }),
        email: Type.String({ format: 'email' }),
      }),
    },
    handler: async (req, res) => {
      const { imageUrl, fileName, email } = req.body;

      if (!isAllowedUrl(imageUrl)) {
        return res.status(403).send({ ok: false, error: 'Image URL not allowed' });
      }

      const resend = new Resend(ENV.RESEND_API_KEY);

      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) {
        return res.status(502).send({ ok: false, error: 'Failed to fetch image' });
      }

      const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());

      await resend.emails.send({
        from: 'Changing Democracies <posters@cd-admin.ovh>',
        to: [email],
        subject: 'Your Changing Democracies Poster',
        text: 'Find your poster attached',
        attachments: [{ filename: fileName, content: imageBuffer }],
      });

      return res.status(200).send({ ok: true });
    },
  });
};
