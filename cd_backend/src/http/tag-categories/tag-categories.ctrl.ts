import { FastifyInstance } from 'fastify';
import { Type } from '@sinclair/typebox';
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import { DataSource, In } from 'typeorm';
import { TagCategoryEntity } from '../../db/entities/TagCategory';
import { NameEntity } from '../../db/entities/Name';
import { LanguageEntity } from '../../db/entities/Language';
import { TagEntity } from '../../db/entities/Tag';
import { NotFoundError } from '../../errors';
import { tagCategorySchema, createTagCategorySchema } from './tag-category.schema';

export const registerTagCategoryControllers =
  (app: FastifyInstance) =>
  ({ dbConnection }: { dbConnection: DataSource }) => {
    app.withTypeProvider<TypeBoxTypeProvider>().route({
      method: 'POST',
      url: '/tag-categories',
      schema: {
        body: Type.Object({
          id: Type.Optional(Type.String()),
          names: Type.Array(
            Type.Object({
              languageCode: Type.String(),
              name: Type.String(),
            })
          ),
          tagIds: Type.Optional(Type.Array(Type.String())),
        }),
        response: {
          200: tagCategorySchema,
          201: tagCategorySchema,
        },
      },
      handler: async (request, reply) => {
        const { id, names, tagIds } = request.body;
        const categoryRepo = dbConnection.getRepository(TagCategoryEntity);
        const nameRepo = dbConnection.getRepository(NameEntity);

        let category: TagCategoryEntity;

        if (id) {
          // Update existing category
          const existingCategory = await categoryRepo.findOne({
            where: { id },
            relations: ['names', 'names.language', 'tags', 'tags.names', 'tags.names.language'],
          });

          if (!existingCategory) {
            throw new NotFoundError('Tag category not found');
          }

          category = existingCategory;

          // Delete existing names
          if (category.names) {
            await nameRepo.remove(category.names);
          }
        } else {
          // Create new category
          category = new TagCategoryEntity();
        }

        // Create new names
        const newNames = await Promise.all(
          names.map(async (n) => {
            const language = await dbConnection.getRepository(LanguageEntity).findOneByOrFail({
              code: n.languageCode,
            });

            const name = new NameEntity();
            name.language = language;
            name.name = n.name;
            name.type = 'TagCategory';
            name.tagCategory = category;
            return name;
          })
        );

        category.names = newNames;

        // Handle tag associations if tagIds are provided
        if (tagIds && tagIds.length > 0) {
          const tagRepo = dbConnection.getRepository(TagEntity);
          const tags = await tagRepo.findBy({
            id: In(tagIds),
          });
          category.tags = tags;
        }

        await categoryRepo.save(category);

        // Return 201 for creation, 200 for update
        return reply.status(id ? 200 : 201).send(parseTagCategoryEntity(category));
      },
    });

    app.withTypeProvider<TypeBoxTypeProvider>().route({
      method: 'DELETE',
      url: '/tag-categories/:id',
      schema: {
        params: Type.Object({
          id: Type.String(),
        }),
        response: {
          204: Type.Null(),
        },
      },
      handler: async (request, reply) => {
        const categoryRepo = dbConnection.getRepository(TagCategoryEntity);
        const nameRepo = dbConnection.getRepository(NameEntity);

        const category = await categoryRepo.findOne({
          where: { id: request.params.id },
          relations: ['names'],
        });

        if (category) {
          // Delete associated names
          if (category.names) {
            await nameRepo.remove(category.names);
          }
          await categoryRepo.remove(category);
        }

        return reply.status(204).send();
      },
    });

    app.withTypeProvider<TypeBoxTypeProvider>().route({
      method: 'GET',
      url: '/tag-categories',
      schema: {
        response: {
          200: Type.Array(tagCategorySchema),
        },
      },
      handler: async (request, reply) => {
        const categories = await dbConnection.getRepository(TagCategoryEntity).find({
          relations: ['names', 'names.language', 'tags', 'tags.names', 'tags.names.language'],
        });

        return reply.send(categories.map(parseTagCategoryEntity));
      },
    });
  };

const parseTagCategoryEntity = (
  category: TagCategoryEntity & {
    names?: NameEntity[] | null;
    tags?: (TagEntity & { names?: NameEntity[] | null })[] | null;
  }
) => {
  return {
    id: category.id,
    names:
      category.names?.map((n) => ({
        languageCode: n.language.code,
        name: n.name,
      })) || [],
    tags:
      category.tags?.map((tag) => ({
        id: tag.id,
        names:
          tag.names?.map((n) => ({
            languageCode: n.language.code,
            name: n.name,
          })) || [],
      })) || [],
  };
};
