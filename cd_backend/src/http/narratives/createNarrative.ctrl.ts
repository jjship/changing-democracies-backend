import { Type, TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import { FastifyInstance } from 'fastify';
import { DataSource } from 'typeorm';
import { narrativeSchema } from './narrative.schema';
import { NarrativeEntity } from '../../db/entities/Narrative';
import { parseNarrativeEntity } from '../../domain/narratives/narratives.api';
import { DescriptionEntity } from '../../db/entities/Description';
import { LanguageEntity } from '../../db/entities/Language';
import { NameEntity } from '../../db/entities/Name';
import { NarrativeFragmentEntity } from '../../db/entities/NarrativeFragment';
import { FragmentEntity } from '../../db/entities/Fragment';

export const registerCreateNarrativeController =
  (app: FastifyInstance) =>
  ({ dbConnection }: { dbConnection: DataSource }) => {
    app.withTypeProvider<TypeBoxTypeProvider>().route({
      method: 'POST',
      url: '/narratives',
      schema: createNarrativeSchema(),
      handler: async (req, res) => {
        const newNarrative = await dbConnection.transaction(async (entityManager) => {
          const { attributes } = req.body.data;

          const languageCodes = attributes.descriptions.map((desc) => desc.languageCode);
          const languages = await entityManager
            .getRepository(LanguageEntity)
            .createQueryBuilder('language')
            .where('language.code IN (:...codes)', { codes: languageCodes })
            .getMany();
          const languageMap = new Map(languages.map((lang) => [lang.code, lang]));

          const missingLanguage = attributes.descriptions.find((desc) => !languageMap.has(desc.languageCode));
          if (missingLanguage) {
            throw {
              statusCode: 404,
              errors: [
                {
                  status: '404',
                  title: 'Language Not Found',
                  detail: `Language with code '${missingLanguage.languageCode}' not found`,
                },
              ],
            };
          }
          const newNarrative = entityManager.getRepository(NarrativeEntity).create();

          const descriptions = attributes.descriptions.map((desc) => {
            const newDescription = new DescriptionEntity();
            newDescription.language = languageMap.get(desc.languageCode)!;
            newDescription.description = desc.description;
            return newDescription;
          });

          await entityManager.getRepository(DescriptionEntity).save(descriptions);

          newNarrative.descriptions = descriptions;

          const names = attributes.names.map((name) => {
            const newName = new NameEntity();
            newName.type = 'Narrative';
            newName.name = name.name;
            newName.language = languageMap.get(name.languageCode)!;
            return newName;
          });

          await entityManager.getRepository(NameEntity).save(names);

          newNarrative.names = names;

          await entityManager.getRepository(NarrativeEntity).save(newNarrative);

          let totalDurationSec = 0;

          const narrativeFragments = await Promise.all(
            attributes.fragmentsSequence.map(async (fragment) => {
              const fragmentEntity = await entityManager.getRepository(FragmentEntity).findOne({
                where: { id: fragment.fragmentId },
              });
              if (!fragmentEntity) {
                throw {
                  statusCode: 404,
                  errors: [
                    {
                      status: '404',
                      title: 'Fragment Not Found',
                      detail: `Fragment with id '${fragment.fragmentId}' not found`,
                    },
                  ],
                };
              }

              totalDurationSec += fragmentEntity.durationSec;

              const newNarrativeFragment = new NarrativeFragmentEntity();
              newNarrativeFragment.fragment = fragmentEntity;
              newNarrativeFragment.sequence = fragment.sequence;
              newNarrativeFragment.narrative = newNarrative;
              await entityManager.getRepository(NarrativeFragmentEntity).save(newNarrativeFragment);

              return newNarrativeFragment;
            })
          );

          await entityManager.getRepository(NarrativeFragmentEntity).save(narrativeFragments);

          newNarrative.narrativeFragments = narrativeFragments;

          newNarrative.totalDurationSec = totalDurationSec;

          await entityManager.save(NarrativeEntity, newNarrative);
          return newNarrative;
        });

        return res.status(200).send({
          ...parseNarrativeEntity(newNarrative),
          id: newNarrative.id,
        });
      },
    });
  };

function createNarrativeSchema() {
  return {
    description: 'Create new narrative.',
    tags: ['narratives'] as string[],
    body: Type.Object({
      data: Type.Object({
        type: Type.Literal('narrative'),
        attributes: Type.Object({
          names: Type.Array(Type.Object({ languageCode: Type.String(), name: Type.String() })),
          fragmentsSequence: Type.Array(Type.Object({ fragmentId: Type.String(), sequence: Type.Number() })),
          descriptions: Type.Array(
            Type.Object({ languageCode: Type.String(), description: Type.Array(Type.String()) })
          ),
        }),
      }),
    }),
    response: {
      200: Type.Object({
        type: Type.Literal('narrative'),
        id: Type.String(),
        attributes: narrativeSchema,
      }),
      404: Type.Object({
        errors: Type.Array(
          Type.Object({
            status: Type.String(),
            title: Type.String(),
            detail: Type.String(),
          })
        ),
      }),
    },
  };
}
