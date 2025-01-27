import { cdApiRequest } from './cdApi';

export type Language = {
  id: string;
  name: string;
  code: string;
};

export type CreateLanguageRequest = {
  name: string;
  code: string;
};

export type UpdateLanguageRequest = CreateLanguageRequest;

export const languagesApi = {
  async createLanguage(data: CreateLanguageRequest): Promise<Language> {
    return cdApiRequest<Language>({
      endpoint: '/languages',
      options: {
        method: 'POST',
        body: JSON.stringify(data),
      },
    });
  },

  async updateLanguage(id: string, data: UpdateLanguageRequest): Promise<Language> {
    return cdApiRequest<Language>({
      endpoint: `/languages/${id}`,
      options: {
        method: 'PUT',
        body: JSON.stringify(data),
      },
    });
  },

  async deleteLanguage(id: string): Promise<void> {
    await cdApiRequest<void>({
      endpoint: `/languages/${id}`,
      options: {
        method: 'DELETE',
      },
    });
  },

  async getLanguages(): Promise<Language[]> {
    return cdApiRequest<Language[]>({
      endpoint: '/languages',
      options: {
        method: 'GET',
      },
    });
  },
};
