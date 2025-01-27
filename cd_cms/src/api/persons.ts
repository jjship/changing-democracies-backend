import { cdApiRequest } from './cdApi';

export type Person = {
  id: string;
  name: string;
  countryId?: string;
};

export type CreatePersonRequest = {
  name: string;
  countryId?: string;
};

export type UpdatePersonRequest = CreatePersonRequest;

export const personsApi = {
  async createPerson(data: CreatePersonRequest): Promise<Person> {
    return cdApiRequest<Person>({
      endpoint: '/persons',
      options: {
        method: 'POST',
        body: JSON.stringify(data),
      },
    });
  },

  async updatePerson(id: string, data: UpdatePersonRequest): Promise<Person> {
    return cdApiRequest<Person>({
      endpoint: `/persons/${id}`,
      options: {
        method: 'PUT',
        body: JSON.stringify(data),
      },
    });
  },

  async deletePerson(id: string): Promise<void> {
    await cdApiRequest<void>({
      endpoint: `/persons/${id}`,
      options: {
        method: 'DELETE',
      },
    });
  },

  async getPersons(): Promise<Person[]> {
    return cdApiRequest<Person[]>({
      endpoint: '/persons',
      options: {
        method: 'GET',
      },
    });
  },
};
