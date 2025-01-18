import { Type } from '@fastify/type-provider-typebox';

export const tagSchema = Type.Object(
  {
    id: Type.String(),
    names: Type.Array(
      Type.Object({
        languageCode: Type.String(),
        name: Type.String(),
      })
    ),
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

export const updateTagSchema = createTagSchema;
