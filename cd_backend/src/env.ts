import { z } from 'zod';

const portSchema = z.string().regex(/^\d+$/).transform(Number);

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  BACKEND_HOST: z.string(),
  BACKEND_PORT: portSchema.default('8083'),

  DB_HOST: z.string(),
  DB_PORT: portSchema.default('8084'),
  DB_USER: z.string(),
  DB_PASSWORD: z.string(),
  DB_DATABASE: z.string(),
  TEST_DATABASE: z.string(),

  BUNNY_STREAM_API_KEY: z.string(),
  BUNNY_STREAM_LIBRARY_ID: z.string(),
  BUNNY_STREAM_PULL_ZONE: z.string(),
  BUNNY_STREAM_COLLECTION_ID: z.string(),
});

export const env = envSchema.parse(process.env);
