import { cdApiRequest } from './cdApi';
import { Name } from './commonTypes';

export type NarrativeDescription = {
  languageCode: string;
  description: string[];
};

export type NarrativeFragment = {
  fragmentId: string;
  sequence: number;
};

export type CreateNarrativeAttributes = {
  names: Name[];
  descriptions: NarrativeDescription[];
  fragmentsSequence: NarrativeFragment[];
};

export type CreateNarrativeRequest = {
  data: {
    type: 'narrative';
    attributes: CreateNarrativeAttributes;
  };
};

export type UpdateNarrativeAttributes = CreateNarrativeAttributes;

export type NarrativePayload = {
  id: string;
  type: 'narrative';
  attributes: {
    names: Name[];
    descriptions: NarrativeDescription[];
    fragmentsSequence: NarrativeFragment[];
    totalDurationSec: number;
  };
};

export type Narrative = {
  id: string;
  names: Name[];
  descriptions: NarrativeDescription[];
  fragmentsSequence: NarrativeFragment[];
  totalDurationSec: number;
};

export const parseNarrativePayload = (payload: NarrativePayload): Narrative => {
  return {
    id: payload.id,
    names: payload.attributes.names,
    descriptions: payload.attributes.descriptions,
    fragmentsSequence: payload.attributes.fragmentsSequence,
    totalDurationSec: payload.attributes.totalDurationSec,
  };
};

export const narrativesApi = {
  async createNarrative(attributes: CreateNarrativeAttributes): Promise<Narrative> {
    const requestPayload: CreateNarrativeRequest = {
      data: {
        type: 'narrative',
        attributes,
      },
    };

    try {
      const response = await cdApiRequest<NarrativePayload>({
        endpoint: '/narratives',
        options: {
          method: 'POST',
          body: JSON.stringify(requestPayload),
        },
      });
      return parseNarrativePayload(response);
    } catch (error) {
      console.error('Error creating narrative:', error);
      throw error;
    }
  },

  async updateNarrative(id: string, attributes: UpdateNarrativeAttributes): Promise<Narrative> {
    const requestPayload: CreateNarrativeRequest = {
      data: {
        type: 'narrative',
        attributes,
      },
    };

    try {
      const response = await cdApiRequest<NarrativePayload>({
        endpoint: `/narratives/${id}`,
        options: {
          method: 'PATCH',
          body: JSON.stringify(requestPayload),
        },
      });
      return parseNarrativePayload(response);
    } catch (error) {
      console.error('Error updating narrative:', error);
      throw error;
    }
  },

  async deleteNarrative(id: string): Promise<void> {
    try {
      await cdApiRequest<void>({
        endpoint: `/narratives/${id}`,
        options: {
          method: 'DELETE',
          body: JSON.stringify({ id }),
        },
      });
    } catch (error) {
      console.error('Error deleting narrative:', error);
      throw error;
    }
  },

  async getNarratives(): Promise<Narrative[]> {
    try {
      const response = await cdApiRequest<NarrativePayload[]>({
        endpoint: '/narratives',
        options: {
          method: 'GET',
        },
      });
      return response.map(parseNarrativePayload);
    } catch (error) {
      console.error('Error fetching narratives:', error);
      throw error;
    }
  },
};
