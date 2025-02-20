import { cdApiRequest } from './cdApi';

export type Country = {
  id: string;
  names: {
    languageCode: string;
    name: string;
  }[];
  code: string;
};

export type CreateCountryRequest = {
  names: {
    languageCode: string;
    name: string;
  }[];
  code: string;
};

export type UpdateCountryRequest = CreateCountryRequest;

export const countriesApi = {
  async createCountry(data: CreateCountryRequest): Promise<Country> {
    return cdApiRequest<Country>({
      endpoint: '/countries',
      options: {
        method: 'POST',
        body: JSON.stringify(data),
      },
    });
  },

  async updateCountry(id: string, data: UpdateCountryRequest): Promise<Country> {
    return cdApiRequest<Country>({
      endpoint: `/countries/${id}`,
      options: {
        method: 'PUT',
        body: JSON.stringify(data),
      },
    });
  },

  async deleteCountry(id: string): Promise<void> {
    await cdApiRequest<void>({
      endpoint: `/countries/${id}`,
      options: {
        method: 'DELETE',
      },
    });
  },

  async getCountries(): Promise<Country[]> {
    return cdApiRequest<Country[]>({
      endpoint: '/countries',
      options: {
        method: 'GET',
      },
    });
  },
};
