import { Type } from '@fastify/type-provider-typebox';

export const fragmentSummarySchema = Type.Object({
  id: Type.String(),
  title: Type.String(),
  thumbnailUrl: Type.String(),
});

export const tagSchema = Type.Object(
  {
    id: Type.String(),
    names: Type.Array(
      Type.Object({
        languageCode: Type.String(),
        name: Type.String(),
      })
    ),
    fragments: Type.Array(fragmentSummarySchema),
  },
  { $id: 'Tag' }
);

export const createTagSchema = Type.Object({
  names: Type.Array(
    Type.Object({
      languageCode: Type.String(),
      name: Type.String(),
    })
  ),
});

export const updateTagSchema = Type.Object({
  names: Type.Array(
    Type.Object({
      languageCode: Type.String(),
      name: Type.String(),
    })
  ),
  fragmentIds: Type.Optional(Type.Array(Type.String())),
});
