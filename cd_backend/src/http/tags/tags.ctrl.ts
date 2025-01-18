import { FastifyInstance } from 'fastify';
import { Type, TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import { DataSource } from 'typeorm';
import { TagEntity } from '../../db/entities/Tag';
import { NameEntity } from '../../db/entities/Name';
import { tagSchema, createTagSchema, updateTagSchema } from './tag.schema';
import { LanguageEntity } from '../../db/entities/Language';

export const registerTagControllers =
  (app: FastifyInstance) =>
  ({ dbConnection }: { dbConnection: DataSource }) => {
    app.withTypeProvider<TypeBoxTypeProvider>().route({
      method: 'POST',
      url: '/tags',
      schema: {
        body: createTagSchema,
        response: {
          201: tagSchema,
        },
      },
      handler: async (request, reply) => {
        const tag = new TagEntity();

        // Create names with proper language relations
        const names = await Promise.all(
          request.body.names.map(async (n) => {
            const language = await dbConnection.getRepository(LanguageEntity).findOneByOrFail({
              code: n.languageCode,
            });

            const name = new NameEntity();
            name.language = language;
            name.name = n.name;
            name.type = 'Tag';
            name.tag = tag;
            return name;
          })
        );

        tag.names = names;
        await dbConnection.getRepository(TagEntity).save(tag);

        // Format response according to schema
        return reply.status(201).send({
          id: tag.id,
          names:
            tag.names?.map((n) => ({
              languageCode: n.language.code,
              name: n.name,
            })) || [],
        });
      },
    });

    app.withTypeProvider<TypeBoxTypeProvider>().route({
      method: 'PUT',
      url: '/tags/:id',
      schema: {
        params: Type.Object({
          id: Type.String(),
        }),
        body: updateTagSchema,
        response: {
          200: tagSchema,
        },
      },
      handler: async (request, reply) => {
        const tagRepo = dbConnection.getRepository(TagEntity);
        const nameRepo = dbConnection.getRepository(NameEntity);

        // Find existing tag
        const tag = await tagRepo.findOne({
          where: { id: request.params.id },
          relations: ['names', 'names.language'],
        });

        if (!tag) {
          throw app.httpErrors.notFound('Tag not found');
        }

        // Delete existing names
        if (tag.names) {
          await nameRepo.remove(tag.names);
        }

        // Create new names
        const names = await Promise.all(
          request.body.names.map(async (n) => {
            const language = await dbConnection.getRepository(LanguageEntity).findOneByOrFail({
              code: n.languageCode,
            });

            const name = new NameEntity();
            name.language = language;
            name.name = n.name;
            name.type = 'Tag';
            name.tag = tag;
            return name;
          })
        );

        tag.names = names;
        await tagRepo.save(tag);

        return reply.send({
          id: tag.id,
          names: tag.names.map((n) => ({
            languageCode: n.language.code,
            name: n.name,
          })),
        });
      },
    });

    app.withTypeProvider<TypeBoxTypeProvider>().route({
      method: 'DELETE',
      url: '/tags/:id',
      schema: {
        params: Type.Object({
          id: Type.String(),
        }),
        response: {
          204: Type.Null(),
        },
      },
      handler: async (request, reply) => {
        await dbConnection.getRepository(TagEntity).delete(request.params.id);
        return reply.status(204).send();
      },
    });
  };
