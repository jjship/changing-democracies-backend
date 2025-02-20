import { Type } from '@fastify/type-provider-typebox';

export const personSchema = Type.Object(
  {
    name: Type.String(),
    countryCode: Type.String(),
    bios: Type.Optional(
      Type.Array(
        Type.Object({
          bio: Type.String(),
          languageCode: Type.String(),
        })
      )
    ),
  },
  { $id: 'Person' }
);

export const updatePersonSchema = Type.Object({
  name: Type.String(),
  countryCode: Type.Optional(Type.String()),
  bio: Type.Optional(Type.String()),
  languageId: Type.Optional(Type.String()),
});
