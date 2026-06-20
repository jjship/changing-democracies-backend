import { cdApiRequest, NotFoundError } from './cdApi';

export type Caption = {
  srclang: string;
  label: string;
};

type MetaTag = {
  property: string;
  value: string;
};

// Raw shape returned by GET /videos (the subset of Bunny's video object we use).
type BunnyVideoPayload = {
  guid: string;
  title: string;
  length: number;
  captions: Caption[];
  metaTags: MetaTag[];
};

export type Video = {
  guid: string;
  title: string;
  length: string; // formatted MM:SS
  tags: string;
  description: string;
  captions: Caption[]; // user-facing tracks; "*-auto" variants filtered out
};

const formatLength = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const parseVideo = (video: BunnyVideoPayload): Video => ({
  guid: video.guid,
  title: video.title,
  length: formatLength(video.length ?? 0),
  tags: video.metaTags?.find((tag) => tag.property === 'tags')?.value ?? '',
  description: video.metaTags?.find((tag) => tag.property === 'description')?.value ?? '',
  captions: (video.captions ?? []).filter((caption) => !caption.srclang.endsWith('-auto')),
});

export const videosApi = {
  async getVideos(): Promise<Video[]> {
    const videos = await cdApiRequest<BunnyVideoPayload[]>({
      endpoint: '/videos',
      options: { method: 'GET' },
    });
    return videos.map(parseVideo);
  },

  async getCaptions(videoId: string, srclang: string): Promise<string> {
    try {
      const { vtt } = await cdApiRequest<{ vtt: string }>({
        endpoint: `/videos/${videoId}/captions/${srclang}`,
        options: { method: 'GET' },
      });
      return vtt;
    } catch (error) {
      // A language with no track yet returns 404 — treat as empty.
      if (error instanceof NotFoundError) return '';
      throw error;
    }
  },

  async updateVideo(id: string, data: { title?: string; tags?: string }): Promise<void> {
    await cdApiRequest<void>({
      endpoint: `/videos/${id}`,
      options: { method: 'PATCH', body: JSON.stringify(data) },
    });
  },

  async uploadCaptions(id: string, srclang: string, data: { label: string; vtt: string }): Promise<void> {
    await cdApiRequest<void>({
      endpoint: `/videos/${id}/captions/${srclang}`,
      options: { method: 'PUT', body: JSON.stringify(data) },
    });
  },
};
