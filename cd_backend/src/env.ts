import { z } from 'zod';

const portSchema = z.string().regex(/^\d+$/).transform(Number);

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  BACKEND_HOST: z.string(),
  BACKEND_PORT: portSchema.default('8083'),

  DB_DATABASE: z.string(),
  TEST_DATABASE: z.string(),

  BUNNY_STREAM_BASE_URL: z.string(),
  BUNNY_STREAM_API_KEY: z.string(),
  BUNNY_STREAM_LIBRARY_ID: z.string(),
  BUNNY_STREAM_PULL_ZONE: z.string(),
  BUNNY_STREAM_COLLECTION_ID: z.string(),

  COUNTRY_LAYER_BASE_URL: z.string(),
  COUNTRY_LAYER_API_KEY: z.string(),
  SYNC_COUNTRIES: z
    .string()
    .transform((val) => (val === 'true' || val === 'false' ? val === 'true' : val))
    .refine((val) => typeof val === 'boolean', {
      message: 'SYNC_COUNTRIES must be a boolean',
    }),

  // Supabase authentication
  SUPABASE_JWT_SECRET: z.string(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors);
  throw new Error('Invalid environment variables');
}

export const ENV = parsed.data;

