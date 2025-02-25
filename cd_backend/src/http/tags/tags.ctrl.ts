import { FastifyInstance } from 'fastify';
import { Type, TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import { DataSource } from 'typeorm';
import { TagEntity } from '../../db/entities/Tag';
import { NameEntity } from '../../db/entities/Name';
import { tagSchema, createTagSchema, updateTagSchema } from './tag.schema';
import { LanguageEntity } from '../../db/entities/Language';
import { NotFoundError } from '../../errors';
import { FragmentEntity } from '../../db/entities/Fragment';
import { In } from 'typeorm';

export const registerTagControllers =
  (app: FastifyInstance) =>
  ({ dbConnection }: { dbConnection: DataSource }) => {
    app.withTypeProvider<TypeBoxTypeProvider>().route({
      method: 'GET',
      url: '/tags',
      schema: {
        response: {
          200: Type.Array(tagSchema),
        },
      },
      handler: async (request, reply) => {
        const tagRepo = dbConnection.getRepository(TagEntity);

        const tags = await tagRepo.find({
          relations: ['names', 'names.language', 'fragments'],
        });

        return reply.send(
          tags
            .map((tag) => parseTagEntity(tag))
            .sort(
              (a, b) =>
                a.names
                  .find((n) => n.languageCode === 'EN')
                  ?.name.localeCompare(b.names.find((n) => n.languageCode === 'EN')?.name ?? '') ?? 0
            )
        );
      },
    });

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
        return reply.status(201).send(parseTagEntity(tag));
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
          relations: ['names', 'names.language', 'fragments'],
        });

        if (!tag) {
          throw new NotFoundError('Tag not found');
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

        // Handle fragment associations if fragmentIds are provided
        if (request.body.fragmentIds && request.body.fragmentIds.length > 0) {
          const fragmentRepo = dbConnection.getRepository(FragmentEntity);
          const fragments = await fragmentRepo.findBy({
            id: In(request.body.fragmentIds),
          });

          tag.fragments = fragments;
        }

        await tagRepo.save(tag);

        return reply.send(parseTagEntity(tag));
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
        const tagRepo = dbConnection.getRepository(TagEntity);

        // First find the tag with its fragment associations
        const tag = await tagRepo.findOne({
          where: { id: request.params.id },
          relations: ['fragments'],
        });

        if (tag) {
          // Remove fragment associations by setting fragments to empty array
          // This will update the join table before the tag is deleted
          tag.fragments = [];
          await tagRepo.save(tag);

          // Now delete the tag
          await tagRepo.delete(request.params.id);
        }

        return reply.status(204).send();
      },
    });
  };

const parseTagEntity = (tag: TagEntity & { names?: NameEntity[] | null; fragments?: FragmentEntity[] | null }) => {
  return {
    id: tag.id,
    names:
      tag.names?.map((n) => ({
        languageCode: n.language.code,
        name: n.name,
      })) || [],
    fragments:
      tag.fragments?.map((fragment) => ({
        id: fragment.id,
        title: fragment.title,
        thumbnailUrl: fragment.thumbnailUrl,
      })) || [],
  };
};
