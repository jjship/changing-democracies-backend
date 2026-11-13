import { Type, TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import { FastifyInstance } from 'fastify';
import { Resend } from 'resend';
import { requireApiKey } from '../../auth/apiKeyAuth';
import { ENV } from '../../env';
import { ipRateLimitKey } from '../../rateLimit';
import { isPosterFileName, POSTER_FILE_NAME_PATTERN } from './posterFileName';

const postersBaseUrl = `https://${ENV.BUNNY_STORAGE_PULL_ZONE}.b-cdn.net/posters/`;

// Only our own pull zone, and only a plain poster file name below /posters/
function isPosterUrl(url: string): boolean {
  try {
    const { href } = new URL(url);
    return href.startsWith(postersBaseUrl) && isPosterFileName(href.slice(postersBaseUrl.length));
  } catch {
    return false;
  }
}

export const registerSendPosterEmailController = (app: FastifyInstance) => () => {
  app.withTypeProvider<TypeBoxTypeProvider>().route({
    method: 'POST',
    url: '/photobooth/posters/send-email',
    // the kiosk key ships in the SPA, so budget per address
    config: { rateLimit: { max: 30, timeWindow: '10 minutes', keyGenerator: ipRateLimitKey } },
    preHandler: [requireApiKey('write:photobooth')],
    schema: {
      body: Type.Object({
        imageUrl: Type.String({ format: 'uri', maxLength: 2048 }),
        fileName: Type.String({ pattern: POSTER_FILE_NAME_PATTERN, maxLength: 255 }),
        email: Type.String({ format: 'email', maxLength: 254 }),
      }),
    },
    handler: async (req, res) => {
      const { imageUrl, fileName, email } = req.body;

      if (!isPosterUrl(imageUrl)) {
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
