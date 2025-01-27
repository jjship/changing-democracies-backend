import { Type, TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import { FastifyInstance } from 'fastify';
import { DataSource, In } from 'typeorm';
import { FragmentEntity } from '../../db/entities/Fragment';
import { PersonEntity } from '../../db/entities/Person';
import { TagEntity } from '../../db/entities/Tag';
import { parseFragmentEntity } from '../../domain/fragments/fragments.api';
import { errorResponseSchema, NotFoundError } from '../../errors';

export const registerUpdateFragmentsController =
  (app: FastifyInstance) =>
  ({ dbConnection }: { dbConnection: DataSource }) => {
    app.withTypeProvider<TypeBoxTypeProvider>().route({
      method: 'PATCH',
      url: '/fragments',
      schema: updateFragmentsSchema(),
      handler: async (req, res) => {
        const updatedFragments = await dbConnection.transaction(async (entityManager) => {
          const fragmentRepo = entityManager.getRepository(FragmentEntity);
          const personRepo = entityManager.getRepository(PersonEntity);
          const tagRepo = entityManager.getRepository(TagEntity);

          const fragmentIds = req.body.data.map((item) => item.id);
          const existingFragments = await fragmentRepo.find({
            where: { id: In(fragmentIds) },
            relations: ['person', 'tags'],
          });

          const notFoundIds = fragmentIds.filter((id) => !existingFragments.find((fragment) => fragment.id === id));

          if (notFoundIds.length > 0) {
            throw new NotFoundError(`Fragments with ids '${notFoundIds.join(', ')}' not found`);
          }

          const updates = await Promise.all(
            req.body.data.map(async (update) => {
              const fragment = existingFragments.find((f) => f.id === update.id)!;

              if (update.title) {
                fragment.title = update.title;
              }

              if (update.personId) {
                const person = await personRepo.findOne({ where: { id: update.personId } });
                if (!person) {
                  throw new NotFoundError(`Person with id '${update.personId}' not found`);
                }
                fragment.person = person;
              }

              if (update.tagIds) {
                const tags = await tagRepo.find({
                  where: { id: In(update.tagIds) },
                });

                const notFoundTagIds = update.tagIds.filter((id) => !tags.find((tag) => tag.id === id));

                if (notFoundTagIds.length > 0) {
                  throw new NotFoundError(`Tags with ids '${notFoundTagIds.join(', ')}' not found`);
                }

                fragment.tags = tags;
              }

              return fragment;
            })
          );

          await entityManager.save(updates);
          return updates;
        });

        return res.status(200).send({
          data: updatedFragments.map((fragment) => ({
            type: 'fragment' as const,
            id: fragment.id,
            attributes: {
              ...parseFragmentEntity(fragment).attributes,
              person: fragment.person
                ? {
                    id: fragment.person.id,
                    name: fragment.person.name,
                  }
                : undefined,
            },
          })),
        });
      },
    });
  };

function updateFragmentsSchema() {
  return {
    description: 'Update multiple fragments.',
    tags: ['fragments'] as string[],
    body: Type.Object({
      data: Type.Array(
        Type.Object({
          id: Type.String(),
          title: Type.Optional(Type.String()),
          personId: Type.Optional(Type.String()),
          tagIds: Type.Optional(Type.Array(Type.String())),
        })
      ),
    }),
    response: {
      200: Type.Object({
        data: Type.Array(
          Type.Object({
            type: Type.Literal('fragment'),
            id: Type.String(),
            attributes: Type.Object({
              title: Type.String(),
              durationSec: Type.Number(),
              playerUrl: Type.String(),
              thumbnailUrl: Type.String(),
              createdAt: Type.String(),
              updatedAt: Type.String(),
              person: Type.Optional(
                Type.Object({
                  id: Type.String(),
                  name: Type.String(),
                })
              ),
              tags: Type.Array(
                Type.Object({
                  id: Type.String(),
                  names: Type.Array(
                    Type.Object({
                      languageCode: Type.String(),
                      name: Type.String(),
                    })
                  ),
                })
              ),
            }),
          })
        ),
      }),
    },
  };
}
