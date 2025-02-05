import { FastifyRequest, FastifyReply } from 'fastify';

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
