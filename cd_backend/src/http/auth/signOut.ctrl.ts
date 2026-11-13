import { FastifyInstance } from 'fastify';
import { DataSource } from 'typeorm';
import { extractSessionToken } from '../../auth/sessionAuth';
import { SESSION_COOKIE_NAME, clearSessionCookieOptions } from '../../auth/sessionCookie';
import { revokeSession } from '../../domain/auth/sessions';

export const registerSignOutController =
  (app: FastifyInstance) =>
  ({ dbConnection }: { dbConnection: DataSource }) => {
    app.route({
      method: 'POST',
      url: '/auth/sign-out',
      handler: async (req, reply) => {
        const extracted = extractSessionToken(req);
        if (extracted) {
          await revokeSession({ dbConnection, token: extracted.token });
        }

        reply.clearCookie(SESSION_COOKIE_NAME, clearSessionCookieOptions());

        return reply.status(204).send();
      },
    });
  };
