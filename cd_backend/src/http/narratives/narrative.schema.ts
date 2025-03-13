import { Type } from '@fastify/type-provider-typebox';

export { narrativeSchema };

const narrativeSchema = Type.Object(
  {
    names: Type.Array(Type.Object({ languageCode: Type.String(), name: Type.String() })),
    totalDurationSec: Type.Number(),
    fragmentsSequence: Type.Array(Type.Object({ fragmentId: Type.String(), sequence: Type.Number() })),
    descriptions: Type.Array(Type.Object({ languageCode: Type.String(), description: Type.Array(Type.String()) })),
  },
  { $id: 'Narrative' }
);
