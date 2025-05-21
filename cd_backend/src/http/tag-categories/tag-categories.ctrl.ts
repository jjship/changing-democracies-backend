import { FastifyInstance } from 'fastify';
import { Type, TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import { DataSource } from 'typeorm';
import { TagCategoryEntity } from '../../db/entities/TagCategory';
import { NameEntity } from '../../db/entities/Name';
import { tagCategorySchema, createTagCategorySchema, updateTagCategorySchema } from './tag-category.schema';
import { LanguageEntity } from '../../db/entities/Language';
import { NotFoundError } from '../../errors';
import { TagEntity } from '../../db/entities/Tag';
import { In } from 'typeorm';

export const registerTagCategoryControllers =
  (app: FastifyInstance) =>
  ({ dbConnection }: { dbConnection: DataSource }) => {
    app.withTypeProvider<TypeBoxTypeProvider>().route({
      method: 'GET',
      url: '/tag-categories',
      schema: {
        response: {
          200: Type.Array(tagCategorySchema),
        },
      },
      handler: async (request, reply) => {
        const categoryRepo = dbConnection.getRepository(TagCategoryEntity);

        const categories = await categoryRepo.find({
          relations: ['names', 'names.language', 'tags', 'tags.names', 'tags.names.language'],
        });

        return reply.send(
          categories
            .map((category) => parseTagCategoryEntity(category))
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
      url: '/tag-categories',
      schema: {
        body: createTagCategorySchema,
        response: {
          201: tagCategorySchema,
        },
      },
      handler: async (request, reply) => {
        const category = new TagCategoryEntity();

        // Create names with proper language relations
        const names = await Promise.all(
          request.body.names.map(async (n) => {
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

        category.names = names;

        // Handle tag associations if tagIds are provided
        if (request.body.tagIds && request.body.tagIds.length > 0) {
          const tagRepo = dbConnection.getRepository(TagEntity);
          const tags = await tagRepo.findBy({
            id: In(request.body.tagIds),
          });
          category.tags = tags;
        }

        await dbConnection.getRepository(TagCategoryEntity).save(category);

        // Format response according to schema
        return reply.status(201).send(parseTagCategoryEntity(category));
      },
    });

    app.withTypeProvider<TypeBoxTypeProvider>().route({
      method: 'PUT',
      url: '/tag-categories/:id',
      schema: {
        params: Type.Object({
          id: Type.String(),
        }),
        body: updateTagCategorySchema,
        response: {
          200: tagCategorySchema,
        },
      },
      handler: async (request, reply) => {
        const categoryRepo = dbConnection.getRepository(TagCategoryEntity);
        const nameRepo = dbConnection.getRepository(NameEntity);

        // Find existing category
        const category = await categoryRepo.findOne({
          where: { id: request.params.id },
          relations: ['names', 'names.language', 'tags', 'tags.names', 'tags.names.language'],
        });

        if (!category) {
          throw new NotFoundError('Tag category not found');
        }

        // Delete existing names
        if (category.names) {
          await nameRepo.remove(category.names);
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
            name.type = 'TagCategory';
            name.tagCategory = category;
            return name;
          })
        );

        category.names = names;

        // Handle tag associations if tagIds are provided
        if (request.body.tagIds && request.body.tagIds.length > 0) {
          const tagRepo = dbConnection.getRepository(TagEntity);
          const tags = await tagRepo.findBy({
            id: In(request.body.tagIds),
          });
          category.tags = tags;
        }

        await categoryRepo.save(category);

        return reply.send(parseTagCategoryEntity(category));
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

        // First find the category with its tag associations
        const category = await categoryRepo.findOne({
          where: { id: request.params.id },
          relations: ['tags'],
        });

        if (category) {
          // Remove tag associations by setting tags to empty array
          // This will update the join table before the category is deleted
          category.tags = [];
          await categoryRepo.save(category);

          // Now delete the category
          await categoryRepo.delete(request.params.id);
        }

        return reply.status(204).send();
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
