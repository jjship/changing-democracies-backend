import { Type } from '@fastify/type-provider-typebox';

export const countrySchema = Type.Object(
  {
    id: Type.String(),
    names: Type.Array(
      Type.Object({
        languageCode: Type.String(),
        name: Type.String(),
      })
    ),
    code: Type.Optional(Type.String({ maxLength: 2 })),
  },
  { $id: 'Country' }
);

export const createCountrySchema = Type.Object({
  names: Type.Array(
    Type.Object({
      languageCode: Type.String(),
      name: Type.String(),
    })
  ),
  code: Type.String({ maxLength: 2 }),
});

export const updateCountrySchema = createCountrySchema;
