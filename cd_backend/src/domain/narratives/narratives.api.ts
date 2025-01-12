import { NarrativeEntity } from '../../db/entities/Narrative';
import { narrativeSchema } from '../../http/narratives/narrative.schema';

export { getAllNarratives, getNarrativeById } from './narratives.querying';

export { parseNarrativeEntity };

export type NarrativeAttributes = typeof narrativeSchema.static;

export type NarrativePayload = { type: 'narrative'; id?: string; attributes: NarrativeAttributes };

function parseNarrativeEntity(narrative: NarrativeEntity): NarrativePayload {
  return {
    type: 'narrative',
    id: narrative.id,
    attributes: {
      createdAt: narrative.createdAt.toISOString(),
      updatedAt: narrative.updatedAt.toISOString(),
      names:
        narrative.names?.map((name) => ({
          languageCode: name.language.code,
          name: name.name,
        })) ?? [],
      totalDurationSec: narrative.totalDurationSec,
      fragmentsSequence:
        narrative.narrativeFragments?.map((nf) => ({
          fragmentId: nf.fragment.id,
          sequence: nf.sequence,
        })) ?? [],
      descriptions:
        narrative.descriptions?.map((desc) => ({
          languageCode: desc.language.code,
          description: desc.description,
        })) ?? [],
    },
  };
}
