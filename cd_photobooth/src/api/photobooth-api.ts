import { env } from '../env';

const headers = () => ({
  'x-api-key': env.VITE_API_KEY,
});

export type PosterMetadata = {
  id: string;
  fileName: string;
  createdAt: string;
  imageUrl?: string;
};

export const photoboothApi = {
  async uploadPoster(formData: FormData): Promise<{ ok: boolean }> {
    const res = await fetch(`${env.VITE_API_BASE_URL}/photobooth/posters`, {
      method: 'PUT',
      headers: headers(),
      body: formData,
    });
    if (!res.ok) throw new Error('Failed to upload poster');
    return res.json() as Promise<{ ok: boolean }>;
  },

  async listPosters(): Promise<PosterMetadata[]> {
    const res = await fetch(`${env.VITE_API_BASE_URL}/photobooth/posters`, {
      headers: { ...headers(), Accept: 'application/json' },
    });
    if (!res.ok) throw new Error('Failed to list posters');
    return res.json() as Promise<PosterMetadata[]>;
  },

  async deletePoster(fileName: string): Promise<{ ok: boolean }> {
    const res = await fetch(
      `${env.VITE_API_BASE_URL}/photobooth/posters/${encodeURIComponent(fileName)}`,
      {
        method: 'DELETE',
        headers: headers(),
      },
    );
    if (!res.ok) throw new Error('Failed to delete poster');
    return res.json() as Promise<{ ok: boolean }>;
  },

  async sendEmail(data: {
    imageUrl: string;
    fileName: string;
    email: string;
  }): Promise<void> {
    const res = await fetch(
      `${env.VITE_API_BASE_URL}/photobooth/posters/send-email`,
      {
        method: 'POST',
        headers: { ...headers(), 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      },
    );
    if (!res.ok) throw new Error('Failed to send email');
  },

  getPosterImageUrl(fileName: string): string {
    return `https://${env.VITE_STORAGE_PULL_ZONE}.b-cdn.net/posters/${fileName}`;
  },
};
