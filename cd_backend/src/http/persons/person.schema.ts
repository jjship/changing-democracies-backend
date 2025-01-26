import { Type } from '@fastify/type-provider-typebox';

export const personSchema = Type.Object(
  {
    id: Type.String(),
    name: Type.String(),
    countryId: Type.Optional(Type.String()),
  },
  { $id: 'Person' }
);

export const createPersonSchema = Type.Object({
  name: Type.String(),
  countryId: Type.Optional(Type.String()),
});

export const updatePersonSchema = createPersonSchema;
