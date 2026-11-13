import fp from 'fastify-plugin';
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
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
  }
}

interface ApiClient {
  name: string;
  permissions: string[];
}

// Map, so header values like "constructor" cannot hit prototype keys
const API_CLIENTS = new Map<string, ApiClient>([
  [ENV.CLIENT_API_KEY, { name: 'client', permissions: ['read:public', 'read:client-protected'] }],
  [
    ENV.GITHUB_API_KEY,
    { name: 'github', permissions: ['read:public', 'read:github-protected', 'write:github-protected'] },
  ],
  [ENV.PHOTOBOOTH_API_KEY, { name: 'photobooth', permissions: ['read:photobooth', 'write:photobooth'] }],
]);

// eslint-disable-next-line @typescript-eslint/require-await
export default fp(async (fastify: FastifyInstance) => {
  // eslint-disable-next-line @typescript-eslint/require-await
  fastify.decorate('authenticateApiKey', async (request: FastifyRequest) => {
    try {
      const apiKey = request.headers['x-api-key'];

      if (!apiKey || typeof apiKey !== 'string') {
        return;
      }

      const client = API_CLIENTS.get(apiKey);
      if (client) {
        request.apiClient = client;
      }
    } catch {
      throw new UnauthorizedError('Unauthorized');
    }
  });
});

export const requireApiKey = (requiredPermission?: string) => {
  // eslint-disable-next-line @typescript-eslint/require-await
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

export const requireApiKeyOrSession = (requiredPermission?: string) => {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.apiClient) {
      await request.server.authenticateSession(request);
      return;
    }

    await requireApiKey(requiredPermission)(request, reply);
  };
};
