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
import { NotFoundError } from '../../errors';

export const registerUpdateNarrativeController =
  (app: FastifyInstance) =>
  ({ dbConnection }: { dbConnection: DataSource }) => {
    app.withTypeProvider<TypeBoxTypeProvider>().route({
      method: 'PATCH',
      url: '/narratives/:id',
      schema: updateNarrativeSchema(),
      handler: async (req, res) => {
        const narrative = await dbConnection.transaction(async (entityManager) => {
          const narrativeRepo = entityManager.getRepository(NarrativeEntity);

          const existingNarrative = await narrativeRepo.findOne({
            where: { id: req.params.id },
            relations: [
              'descriptions',
              'names',
              'narrativeFragments',
              'narrativeFragments.fragment',
              'descriptions.language',
              'names.language',
            ],
          });

          if (!existingNarrative) {
            throw new NotFoundError(`Narrative with id '${req.params.id}' not found`);
          }

          const { attributes } = req.body.data;

          const languageCodes = [
            ...(attributes.descriptions?.map((desc) => desc.languageCode) || []),
            ...(attributes.names?.map((name) => name.languageCode) || []),
          ];

          let languages = [];
          let languageMap = new Map();

          if (languageCodes.length > 0) {
            languages = await entityManager
              .getRepository(LanguageEntity)
              .createQueryBuilder('language')
              .where('language.code IN (:...codes)', { codes: languageCodes })
              .getMany();
            languageMap = new Map(languages.map((lang) => [lang.code, lang]));
          }

          const missingLanguage =
            attributes.descriptions?.find((desc) => !languageMap.has(desc.languageCode.toUpperCase())) ||
            attributes.names?.find((name) => !languageMap.has(name.languageCode.toUpperCase()));

          if (missingLanguage) {
            throw new NotFoundError(`Language with code '${(missingLanguage as any).languageCode}' not found`);
          }

          if (attributes.descriptions) {
            await entityManager.remove(existingNarrative.descriptions);

            const descriptions = attributes.descriptions.map((desc) => {
              const newDescription = new DescriptionEntity();
              newDescription.language = languageMap.get(desc.languageCode.toUpperCase())!;
              newDescription.description = desc.description;
              newDescription.narrative = existingNarrative;
              return newDescription;
            });

            existingNarrative.descriptions = descriptions;
            await entityManager.save(descriptions);
          }

          if (attributes.names) {
            await entityManager.remove(existingNarrative.names);

            const names = attributes.names.map((name) => {
              const newName = new NameEntity();
              newName.type = 'Narrative';
              newName.name = name.name;
              newName.language = languageMap.get(name.languageCode.toUpperCase())!;
              newName.narrative = existingNarrative;
              return newName;
            });

            existingNarrative.names = names;
            await entityManager.save(names);
          }

          if (attributes.fragmentsSequence) {
            await entityManager.remove(existingNarrative.narrativeFragments);

            let totalDurationSec = 0;
            const narrativeFragments = await Promise.all(
              attributes.fragmentsSequence.map(async (fragment) => {
                const fragmentEntity = await entityManager.getRepository(FragmentEntity).findOne({
                  where: { id: fragment.fragmentId },
                });
                if (!fragmentEntity) {
                  throw new NotFoundError(`Fragment with id '${fragment.fragmentId}' not found`);
                }

                totalDurationSec += fragmentEntity.durationSec;

                const newNarrativeFragment = new NarrativeFragmentEntity();
                newNarrativeFragment.fragment = fragmentEntity;
                newNarrativeFragment.sequence = fragment.sequence;
                newNarrativeFragment.narrative = existingNarrative;
                return newNarrativeFragment;
              })
            );

            existingNarrative.narrativeFragments = narrativeFragments;
            existingNarrative.totalDurationSec = totalDurationSec;
            await entityManager.save(narrativeFragments);
          }

          await entityManager.save(existingNarrative);

          return existingNarrative;
        });

        return res.status(200).send(parseNarrativeEntity(narrative));
      },
    });
  };

function updateNarrativeSchema() {
  return {
    description: 'Update existing narrative.',
    tags: ['narratives'] as string[],
    params: Type.Object({
      id: Type.String(),
    }),
    body: Type.Object({
      data: Type.Object({
        type: Type.Literal('narrative'),
        attributes: Type.Partial(
          Type.Object({
            names: Type.Array(Type.Object({ languageCode: Type.String(), name: Type.String() })),
            fragmentsSequence: Type.Array(Type.Object({ fragmentId: Type.String(), sequence: Type.Number() })),
            descriptions: Type.Array(
              Type.Object({ languageCode: Type.String(), description: Type.Array(Type.String()) })
            ),
          })
        ),
      }),
    }),
    response: {
      200: Type.Object({
        type: Type.Literal('narrative'),
        id: Type.String(),
        attributes: narrativeSchema,
      }),
    },
  };
}
