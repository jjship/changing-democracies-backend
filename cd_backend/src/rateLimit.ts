import { FastifyRequest } from 'fastify';

// per-minute budgets for the global limiter
const MAX_PER_USER = 300;
const MAX_PER_API_CLIENT = 300;
const MAX_PER_ADDRESS = 100;

// Route-level hook: runs after the scope auth hooks, so only verified identities reach here.
export const rateLimitKey = (req: FastifyRequest): string => {
  if (req.user) {
    return `user:${req.user.id}`;
  }
  if (req.apiClient) {
    return `api:${req.apiClient.name}:${req.ip}`;
  }
  return `ip:${req.ip}`;
};

export const rateLimitMax = (_req: FastifyRequest, key: string): number => {
  if (key.startsWith('user:')) {
    return MAX_PER_USER;
  }
  if (key.startsWith('api:')) {
    return MAX_PER_API_CLIENT;
  }
  return MAX_PER_ADDRESS;
};

export const ipRateLimitKey = (req: FastifyRequest): string => `ip:${req.ip}`;
