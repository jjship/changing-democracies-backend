import { FastifyInstance, FastifyRequest } from 'fastify';
import { Type, TypeBoxTypeProvider, Static } from '@fastify/type-provider-typebox';
import { DataSource } from 'typeorm';
import { LanguageEntity } from '../../db/entities/Language';
import { languageSchema, createLanguageSchema, updateLanguageSchema } from './languages.schema';
import { NotFoundError } from '../../errors';

type CreateLanguageRequest = FastifyRequest<{
  Body: Static<typeof createLanguageSchema>;
}>;

type UpdateLanguageRequest = FastifyRequest<{
  Params: { id: string };
  Body: Static<typeof updateLanguageSchema>;
}>;

export const registerLanguageControllers =
  (app: FastifyInstance) =>
  ({ dbConnection }: { dbConnection: DataSource }) => {
    app.withTypeProvider<TypeBoxTypeProvider>().route({
      method: 'POST',
      url: '/languages',
      schema: {
        body: createLanguageSchema,
        response: {
          201: languageSchema,
        },
      },
      handler: async (request: CreateLanguageRequest, reply) => {
        const language = new LanguageEntity();
        language.name = request.body.name;
        language.code = request.body.code;

        await dbConnection.getRepository(LanguageEntity).save(language);

        return reply.status(201).send({
          id: language.id,
          name: language.name,
          code: language.code,
        });
      },
    });

    app.withTypeProvider<TypeBoxTypeProvider>().route({
      method: 'PUT',
      url: '/languages/:id',
      schema: {
        params: Type.Object({
          id: Type.String(),
        }),
        body: updateLanguageSchema,
        response: {
          200: languageSchema,
        },
      },
      handler: async (request: UpdateLanguageRequest, reply) => {
        const languageRepo = dbConnection.getRepository(LanguageEntity);

        const language = await languageRepo.findOne({
          where: { id: request.params.id },
        });

        if (!language) {
          throw new NotFoundError('Language not found');
        }

        language.name = request.body.name;
        language.code = request.body.code;

        await languageRepo.save(language);

        return reply.send({
          id: language.id,
          name: language.name,
          code: language.code,
        });
      },
    });

    app.withTypeProvider<TypeBoxTypeProvider>().route({
      method: 'GET',
      url: '/languages',
      schema: {
        response: {
          200: Type.Array(languageSchema),
        },
      },
      handler: async (_, reply) => {
        const languages = await dbConnection.getRepository(LanguageEntity).find();

        return reply.send(
          languages.map((language) => ({
            id: language.id,
            name: language.name,
            code: language.code,
          }))
        );
      },
    });

    app.withTypeProvider<TypeBoxTypeProvider>().route({
      method: 'DELETE',
      url: '/languages/:id',
      schema: {
        params: Type.Object({
          id: Type.String(),
        }),
        response: {
          204: Type.Null(),
        },
      },
      handler: async (request: FastifyRequest<{ Params: { id: string } }>, reply) => {
        await dbConnection.getRepository(LanguageEntity).delete(request.params.id);
        return reply.status(204).send();
      },
    });
  };
