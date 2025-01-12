import { Type } from '@fastify/type-provider-typebox';

export { fragmentSchema };

const fragmentSchema = Type.Object(
  {
    createdAt: Type.String(),
    updatedAt: Type.String(),
    title: Type.String(),
    durationSec: Type.Number(),
    playerUrl: Type.String(),
    thumbnailUrl: Type.String(),
    person: Type.Union([Type.Object({ id: Type.String(), name: Type.String() }), Type.Null()]),
    tags: Type.Array(
      Type.Object({
        id: Type.String(),
        names: Type.Array(Type.Object({ languageCode: Type.String(), name: Type.String() })),
      })
    ),
    country: Type.Union([Type.Object({ id: Type.String(), name: Type.String() }), Type.Null()]),
    narratives_ids: Type.Array(Type.String()),
  },
  { $id: 'Fragment' }
);
