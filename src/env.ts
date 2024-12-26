import { z } from 'zod';

const portSchema = z.string().regex(/^\d+$/).transform(Number);

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  PORT: portSchema.default('8083'),

  DB_HOST: z.string(),
  DB_PORT: portSchema.default('8084'),
  DB_USER: z.string(),
  DB_PASSWORD: z.string(),
  DB_DATABASE: z.string(),
});

export const env = envSchema.parse(process.env);
