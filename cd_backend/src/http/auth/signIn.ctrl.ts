import { Type, TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import { FastifyInstance } from 'fastify';
import { DataSource } from 'typeorm';
import { UnauthorizedError } from '../../errors';
import { PASSWORD_MAX_LENGTH, verifyPassword } from '../../auth/password';
import { SESSION_COOKIE_NAME, sessionCookieOptions } from '../../auth/sessionCookie';
import { findAdminUserByEmail } from '../../domain/auth/adminUsers';
import { createSession } from '../../domain/auth/sessions';
import { sessionUserSchema } from './auth.schema';

export const registerSignInController =
  (app: FastifyInstance) =>
  ({ dbConnection }: { dbConnection: DataSource }) => {
    app.withTypeProvider<TypeBoxTypeProvider>().route({
      method: 'POST',
      url: '/auth/sign-in',
      // explicit allowList: the global limiter exempts the CMS Origin
      config: { rateLimit: { max: 5, timeWindow: '1 minute', allowList: () => false } },
      schema: {
        body: Type.Object({
          email: Type.String({ format: 'email', maxLength: 254 }),
          password: Type.String({ minLength: 1, maxLength: PASSWORD_MAX_LENGTH }),
        }),
        response: { 200: Type.Object({ user: sessionUserSchema }) },
      },
      handler: async (req, reply) => {
        const user = await findAdminUserByEmail({ dbConnection, email: req.body.email });
        // verify even for unknown users (timing)
        const valid = await verifyPassword(req.body.password, user?.passwordHash ?? null);

        if (!user || !valid) {
          throw new UnauthorizedError('Invalid email or password');
        }

        const { token, expiresAt } = await createSession({
          dbConnection,
          user,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
        });

        reply.setCookie(SESSION_COOKIE_NAME, token, sessionCookieOptions({ expiresAt }));

        return reply.status(200).send({ user: { id: user.id, email: user.email, name: user.name } });
      },
    });
  };
