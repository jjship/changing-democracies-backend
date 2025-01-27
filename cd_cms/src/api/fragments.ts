import { cdApiRequest } from './cdApi';

export type Fragment = {
  id: string;
  type: 'fragment';
  attributes: {
    title: string;
    durationSec: number;
    playerUrl: string;
    thumbnailUrl: string;
    person: { name: string; id: string } | null;
    tags: string[];
    country: string | null;
    narratives_ids: string[];
  };
};

export type GetFragmentsResponse = {
  data: Fragment[];
};

export const fragmentsApi = {
  async getFragments({ personIds }: { personIds?: string[] }): Promise<GetFragmentsResponse> {
    const queryParams = personIds ? `?personIds=${personIds.join(',')}` : '';
    return cdApiRequest<GetFragmentsResponse>({
      endpoint: `/fragments${queryParams}`,
      options: {
        method: 'GET',
      },
    });
  },
};
