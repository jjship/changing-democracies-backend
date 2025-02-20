import { cdApiRequest } from './cdApi';

export type PersonBio = {
  languageCode: string;
  bio: string;
};

export type CreatePersonAttributes = {
  name: string;
  countryCode: string;
  bios: PersonBio[];
};

export type CreatePersonRequest = {
  data: {
    type: 'person';
    attributes: CreatePersonAttributes;
  };
};

export type UpdatePersonAttributes = CreatePersonAttributes;

export type PersonPayload = {
  id: string;
  type: 'person';
  attributes: {
    name: string;
    countryCode: string;
    bios: PersonBio[];
    createdAt: string;
    updatedAt: string;
  };
};

export type Person = {
  id: string;
  name: string;
  countryCode: string;
  bios: PersonBio[];
  createdAt: Date;
  updatedAt: Date;
};

export const parsePersonPayload = (payload: PersonPayload): Person => {
  return {
    id: payload.id,
    name: payload.attributes.name,
    countryCode: payload.attributes.countryCode,
    bios: payload.attributes.bios,
    createdAt: new Date(payload.attributes.createdAt),
    updatedAt: new Date(payload.attributes.updatedAt),
  };
};

export const personsApi = {
  async createPerson(attributes: CreatePersonAttributes): Promise<Person> {
    const requestPayload: CreatePersonRequest = {
      data: {
        type: 'person',
        attributes,
      },
    };

    try {
      const response = await cdApiRequest<PersonPayload>({
        endpoint: '/persons',
        options: {
          method: 'POST',
          body: JSON.stringify(requestPayload),
        },
      });
      return parsePersonPayload(response);
    } catch (error) {
      console.error('Error creating person:', error);
      throw error;
    }
  },

  async updatePerson(id: string, attributes: UpdatePersonAttributes): Promise<Person> {
    const requestPayload: CreatePersonRequest = {
      data: {
        type: 'person',
        attributes,
      },
    };

    try {
      const response = await cdApiRequest<PersonPayload>({
        endpoint: `/persons/${id}`,
        options: {
          method: 'PATCH',
          body: JSON.stringify(requestPayload),
        },
      });
      return parsePersonPayload(response);
    } catch (error) {
      console.error('Error updating person:', error);
      throw error;
    }
  },

  async deletePerson(id: string): Promise<void> {
    try {
      await cdApiRequest<void>({
        endpoint: `/persons/${id}`,
        options: {
          method: 'DELETE',
        },
      });
    } catch (error) {
      console.error('Error deleting person:', error);
      throw error;
    }
  },

  async getPersons(): Promise<Person[]> {
    try {
      const response = await cdApiRequest<PersonPayload[]>({
        endpoint: '/persons',
        options: {
          method: 'GET',
        },
      });
      return response.map(parsePersonPayload);
    } catch (error) {
      console.error('Error fetching persons:', error);
      throw error;
    }
  },

  async findPerson({ id, name }: { id?: string; name?: string }): Promise<Person | null> {
    try {
      const response = await cdApiRequest<PersonPayload>({
        endpoint: `/person?${id ? `id=${id}` : `name=${name}`}`,
        options: {
          method: 'GET',
        },
      });
      return parsePersonPayload(response);
    } catch (error: unknown) {
      console.dir({ error });
      if (error instanceof Error && error.name === 'NotFoundError') {
        return null;
      }
      console.error('Error finding person:', error);
      throw error;
    }
  },
};
