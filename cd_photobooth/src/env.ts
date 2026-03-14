import { z } from 'zod';

const envSchema = z.object({
  VITE_API_BASE_URL: z.string().min(1),
  VITE_API_KEY: z.string().min(1),
  VITE_STORAGE_PULL_ZONE: z.string().min(1),
});

export const env = envSchema.parse({
  VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
  VITE_API_KEY: import.meta.env.VITE_API_KEY,
  VITE_STORAGE_PULL_ZONE: import.meta.env.VITE_STORAGE_PULL_ZONE,
});
