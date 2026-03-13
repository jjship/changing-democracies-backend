import { DataSource } from 'typeorm';
import { Type, TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import { FastifyInstance } from 'fastify';
import { LanguageEntity } from '../../db/entities/Language';
import { requireApiKeyOrJwt } from '../../auth/apiKeyAuth';
import { languageSchema } from './languages.schema';

export const registerGetLanguagesController =
  (app: FastifyInstance) =>
  ({ dbConnection }: { dbConnection: DataSource }) => {
    app.withTypeProvider<TypeBoxTypeProvider>().route({
      method: 'GET',
      url: '/languages',
      preHandler: [requireApiKeyOrJwt('read:client-protected')],
      schema: getLanguagesSchema(),
      handler: async (_, reply) => {
        const languages = await dbConnection.getRepository(LanguageEntity).find();

        return reply.send(
          languages.map((language) => ({
            id: language.id,
            name: language.name,
            code: language.code,
          })),
        );
      },
    });
  };

function getLanguagesSchema() {
  return {
    description: 'Get all languages',
    tags: ['languages'],
    response: {
      200: Type.Array(languageSchema),
    },
  };
}
