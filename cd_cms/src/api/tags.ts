import { cdApiRequest } from './cdApi';
import { Name } from './commonTypes';

export type FragmentSummary = {
  id: string;
  title: string;
  thumbnailUrl: string;
};

export type Tag = {
  id: string;
  names: Name[];
  fragments: FragmentSummary[];
};

export const tagsApi = {
  async createTag(names: Name[]): Promise<Tag> {
    return cdApiRequest<Tag>({
      endpoint: '/tags',
      options: {
        method: 'POST',
        body: JSON.stringify({ names }),
      },
    });
  },

  async updateTag(id: string, names: Name[], fragmentIds?: string[]): Promise<Tag> {
    const requestBody: { names: Name[]; fragmentIds?: string[] } = { names };

    if (fragmentIds && fragmentIds.length > 0) {
      requestBody.fragmentIds = fragmentIds;
    }

    return cdApiRequest<Tag>({
      endpoint: `/tags/${id}`,
      options: {
        method: 'PUT',
        body: JSON.stringify(requestBody),
      },
    });
  },

  async deleteTag(id: string): Promise<void> {
    await cdApiRequest<void>({
      endpoint: `/tags/${id}`,
      options: {
        method: 'DELETE',
      },
    });
  },

  async getTags(): Promise<Tag[]> {
    return cdApiRequest<Tag[]>({
      endpoint: '/tags',
      options: {
        method: 'GET',
      },
    });
  },
};
