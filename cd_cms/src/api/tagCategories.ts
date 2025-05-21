import { cdApiRequest } from './cdApi';
import { Name } from './commonTypes';

export type TagSummary = {
  id: string;
  names: Name[];
};

export type TagCategory = {
  id: string;
  names: Name[];
  tags: TagSummary[];
};

export const tagCategoriesApi = {
  async saveTagCategory(names: Name[], tagIds?: string[], id?: string): Promise<TagCategory> {
    const requestBody: { id?: string; names: Name[]; tagIds?: string[] } = { names };
    if (id) {
      requestBody.id = id;
    }
    if (tagIds && tagIds.length > 0) {
      requestBody.tagIds = tagIds;
    }

    return cdApiRequest<TagCategory>({
      endpoint: '/tag-categories',
      options: {
        method: 'POST',
        body: JSON.stringify(requestBody),
      },
    });
  },

  async deleteTagCategory(id: string): Promise<void> {
    await cdApiRequest<void>({
      endpoint: `/tag-categories/${id}`,
      options: {
        method: 'DELETE',
      },
    });
  },

  async getTagCategories(): Promise<TagCategory[]> {
    return cdApiRequest<TagCategory[]>({
      endpoint: '/tag-categories',
      options: {
        method: 'GET',
      },
    });
  },
};
