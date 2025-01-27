import { Type } from '@fastify/type-provider-typebox';

export const languageSchema = Type.Object(
  {
    id: Type.String(),
    name: Type.String(),
    code: Type.String(),
  },
  { $id: 'Language' }
);

export const createLanguageSchema = Type.Object({
  name: Type.String(),
  code: Type.String({ minLength: 2, maxLength: 2 }),
});

export const updateLanguageSchema = createLanguageSchema;
