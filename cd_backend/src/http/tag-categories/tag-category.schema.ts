import { Type } from '@fastify/type-provider-typebox';

export const tagSummarySchema = Type.Object({
  id: Type.String(),
  names: Type.Array(
    Type.Object({
      languageCode: Type.String(),
      name: Type.String(),
    })
  ),
});

export const tagCategorySchema = Type.Object(
  {
    id: Type.String(),
    names: Type.Array(
      Type.Object({
        languageCode: Type.String(),
        name: Type.String(),
      })
    ),
    tags: Type.Array(tagSummarySchema),
  },
  { $id: 'TagCategory' }
);

export const createTagCategorySchema = Type.Object({
  names: Type.Array(
    Type.Object({
      languageCode: Type.String(),
      name: Type.String(),
    })
  ),
  tagIds: Type.Optional(Type.Array(Type.String())),
});

export const updateTagCategorySchema = Type.Object({
  names: Type.Array(
    Type.Object({
      languageCode: Type.String(),
      name: Type.String(),
    })
  ),
  tagIds: Type.Optional(Type.Array(Type.String())),
});
