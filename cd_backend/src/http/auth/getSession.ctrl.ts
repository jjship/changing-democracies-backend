import { Type, TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import { FastifyInstance } from 'fastify';
import { UnauthorizedError } from '../../errors';
import { sessionUserSchema } from './auth.schema';

export const registerGetSessionController = (app: FastifyInstance) => () => {
  app.withTypeProvider<TypeBoxTypeProvider>().route({
    method: 'GET',
    url: '/auth/session',
    schema: { response: { 200: Type.Object({ user: sessionUserSchema }) } },
    // eslint-disable-next-line @typescript-eslint/require-await
    handler: async (req, reply) => {
      const user = req.user;
      if (!user) {
        throw new UnauthorizedError('Unauthorized');
      }

      return reply.send({ user: { id: user.id, email: user.email, name: user.name ?? '' } });
    },
  });
};
