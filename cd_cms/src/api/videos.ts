import { cdApiRequest, NotFoundError } from './cdApi';

export type Caption = {
  srclang: string;
  label: string;
};

// Raw shape returned by GET /videos (the subset of Bunny's video object we use).
type BunnyVideoPayload = {
  guid: string;
  title: string;
  length: number;
  captions: Caption[];
};

export type Video = {
  guid: string;
  title: string;
  length: string; // formatted MM:SS
  captions: Caption[]; // user-facing tracks; "*-auto" variants filtered out
};

// Person/country come from the backend Fragment (not Bunny), keyed by video guid.
export type VideoMeta = {
  personId: string | null;
  personName: string | null;
  country: string | null;
};

export type EnrichedVideo = Video & VideoMeta;

const formatLength = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const parseVideo = (video: BunnyVideoPayload): Video => ({
  guid: video.guid,
  title: video.title,
  length: formatLength(video.length ?? 0),
  captions: (video.captions ?? []).filter((caption) => !caption.srclang.endsWith('-auto')),
});

type FragmentMetaPayload = {
  attributes: {
    playerUrl: string;
    person: { id: string; name: string } | null;
    country: { id: string; name: string } | null;
  };
};

// playerUrl looks like https://iframe.mediadelivery.net/embed/{libraryId}/{guid}?...
const guidFromPlayerUrl = (playerUrl: string): string | undefined => {
  const base = playerUrl.split('?')[0] ?? '';
  return base.split('/').pop() || undefined;
};

export const videosApi = {
  async getVideos(): Promise<Video[]> {
    const videos = await cdApiRequest<BunnyVideoPayload[]>({
      endpoint: '/videos',
      options: { method: 'GET' },
    });
    return videos.map(parseVideo);
  },

  // Fragment person/country keyed by Bunny video guid — used for filtering the list.
  async getVideoMeta(): Promise<Map<string, VideoMeta>> {
    const { data } = await cdApiRequest<{ data: FragmentMetaPayload[] }>({
      endpoint: '/fragments',
      options: { method: 'GET' },
    });
    const map = new Map<string, VideoMeta>();
    for (const fragment of data) {
      const guid = guidFromPlayerUrl(fragment.attributes.playerUrl);
      if (!guid) continue;
      map.set(guid, {
        personId: fragment.attributes.person?.id ?? null,
        personName: fragment.attributes.person?.name ?? null,
        country: fragment.attributes.country?.name ?? null,
      });
    }
    return map;
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

  async updateVideo(id: string, data: { title?: string }): Promise<void> {
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
