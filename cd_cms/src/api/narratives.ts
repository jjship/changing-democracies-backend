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

export type Narrative = {
  id: string;
  names: Name[];
  descriptions: NarrativeDescription[];
  fragmentsSequence: NarrativeFragment[];
  totalDurationSec: number;
};

export const narrativesApi = {
  async createNarrative(attributes: CreateNarrativeAttributes): Promise<Narrative> {
    const requestPayload: CreateNarrativeRequest = {
      data: {
        type: 'narrative',
        attributes,
      },
    };

    return cdApiRequest<Narrative>({
      endpoint: '/narratives',
      options: {
        method: 'POST',
        body: JSON.stringify(requestPayload),
      },
    });
  },

  async updateNarrative(id: string, attributes: UpdateNarrativeAttributes): Promise<Narrative> {
    const requestPayload: CreateNarrativeRequest = {
      data: {
        type: 'narrative',
        attributes,
      },
    };

    return cdApiRequest<Narrative>({
      endpoint: `/narratives/${id}`,
      options: {
        method: 'PUT',
        body: JSON.stringify(requestPayload),
      },
    });
  },

  async deleteNarrative(id: string): Promise<void> {
    await cdApiRequest<void>({
      endpoint: `/narratives/${id}`,
      options: {
        method: 'DELETE',
      },
    });
  },

  async getNarratives(): Promise<Narrative[]> {
    return cdApiRequest<Narrative[]>({
      endpoint: '/narratives',
      options: {
        method: 'GET',
      },
    });
  },
};
