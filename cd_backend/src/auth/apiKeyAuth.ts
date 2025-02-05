import fp from 'fastify-plugin';
import fastify, { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { ENV } from '../env';
import { UnauthorizedError } from '../errors';

declare module 'fastify' {
  interface FastifyRequest {
    apiClient?: {
      name: string;
      permissions: string[];
    };
  }
  interface FastifyInstance {
    authenticateApiKey: (request: FastifyRequest) => Promise<void>;
    authenticateJwt: (request: FastifyRequest) => Promise<void>;
  }
}

interface ApiClient {
  name: string;
  permissions: string[];
}

const API_CLIENTS: Record<string, ApiClient> = {
  [ENV.CLIENT_API_KEY]: {
    name: 'client',
    permissions: ['read:public', 'read:client-protected'],
  },
  [ENV.GITHUB_API_KEY]: {
    name: 'github',
    permissions: ['read:public', 'read:github-protected', 'write:github-protected'],
  },
};

export default fp(async (fastify: FastifyInstance) => {
  fastify.decorate('authenticateApiKey', async (request: FastifyRequest) => {
    try {
      const apiKey = request.headers['x-api-key'];

      if (!apiKey || typeof apiKey !== 'string') {
        return;
      }

      const client = API_CLIENTS[apiKey];
      if (client) {
        request.apiClient = client;
      }
    } catch (err) {
      throw new UnauthorizedError('Unauthorized');
    }
  });
});

export const requireApiKey = (requiredPermission?: string) => {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.apiClient) {
      reply.code(401).send({ error: 'Invalid API key' });
      return;
    }

    if (requiredPermission && !request.apiClient.permissions.includes(requiredPermission)) {
      reply.code(403).send({ error: 'Insufficient permissions' });
      return;
    }
  };
};

export const requireApiKeyOrJwt = (requiredPermission?: string) => {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.apiClient) {
      await request.server.authenticateJwt(request);
    } else {
      requireApiKey(requiredPermission)(request, reply);
    }
  };
};
