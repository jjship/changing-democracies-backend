import fp from 'fastify-plugin';
import fastifyJwt from '@fastify/jwt';
import fastifySensible from '@fastify/sensible';
import { FastifyInstance, FastifyRequest } from 'fastify';
import { ENV } from '../env';
import { UnauthorizedError } from '../errors';

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest) => Promise<void>;
    authenticateApiKey: (request: FastifyRequest) => Promise<void>;
    authenticateClientApiKey: (request: FastifyRequest) => Promise<void>;
  }
}

export interface SupabaseJWTPayload {
  aud: string;
  exp: number;
  sub: string;
  email: string;
  role: string;
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: SupabaseJWTPayload;
    user: {
      id: string;
      email: string;
      role: string;
    };
  }
}

export default fp(async (fastify: FastifyInstance) => {
  await fastify.register(fastifySensible);
  await fastify.register(fastifyJwt, {
    secret: ENV.SUPABASE_JWT_SECRET,
  });

  fastify.decorate('authenticate', async (request: FastifyRequest) => {
    try {
      await request.jwtVerify();

      // Transform Supabase JWT claims to our user object
      const jwtUser = request.user as unknown as SupabaseJWTPayload;
      request.user = {
        id: jwtUser.sub,
        email: jwtUser.email,
        role: jwtUser.role,
      };
    } catch (err) {
      throw new UnauthorizedError('Unauthorized');
    }
  });

  // Add a new function for API key authentication
  fastify.decorate('authenticateApiKey', async (request: FastifyRequest) => {
    const apiKey = request.headers['x-api-key'];
    if (!apiKey || apiKey !== ENV.GITHUB_API_KEY) {
      throw new UnauthorizedError('Invalid API Key');
    }
  });

  // Add a new function for client API key authentication
  fastify.decorate('authenticateClientApiKey', async (request: FastifyRequest) => {
    const apiKey = request.headers['x-api-key'];
    if (!apiKey || apiKey !== ENV.CLIENT_API_KEY) {
      throw new UnauthorizedError('Invalid Client API Key');
    }
  });
});
