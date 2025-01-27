import { cdApiRequest } from './cdApi';
import { Name } from './commonTypes';

export type Tag = {
  id: string;
  names: Name[];
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

  async updateTag(id: string, names: Name[]): Promise<Tag> {
    return cdApiRequest<Tag>({
      endpoint: `/tags/${id}`,
      options: {
        method: 'PUT',
        body: JSON.stringify({ names }),
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
