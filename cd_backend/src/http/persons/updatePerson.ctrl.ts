import { Type, TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import { FastifyInstance } from 'fastify';
import { DataSource, In, Not } from 'typeorm';
import { PersonEntity } from '../../db/entities/Person';
import { BioEntity } from '../../db/entities/Bio';
import { LanguageEntity } from '../../db/entities/Language';
import { CountryEntity } from '../../db/entities/Country';
import { personSchema } from './person.schema';
import { HttpError, NotFoundError } from '../../errors';

export const registerUpdatePersonController =
  (app: FastifyInstance) =>
  ({ dbConnection }: { dbConnection: DataSource }) => {
    app.withTypeProvider<TypeBoxTypeProvider>().route({
      method: 'PATCH',
      url: '/persons/:id',
      schema: updatePersonSchema(),
      handler: async (req, res) => {
        const { name, bios, countryCode } = req.body.data.attributes;

        const updatedPerson = await dbConnection.transaction(async (entityManager) => {
          const personId = req.params.id;

          const personRepository = entityManager.getRepository(PersonEntity);
          const languageRepository = entityManager.getRepository(LanguageEntity);
          const bioRepository = entityManager.getRepository(BioEntity);
          const countryRepository = entityManager.getRepository(CountryEntity);

          const existingPerson = await personRepository.findOne({
            where: { id: personId },
            relations: ['bios', 'bios.language', 'country'],
          });

          if (!existingPerson) {
            throw new NotFoundError(`Person with id '${personId}' not found`);
          }

          if (name) {
            const duplicatePerson = await personRepository.findOne({
              where: { name, id: Not(personId) },
            });

            if (duplicatePerson) {
              throw new HttpError('Person already exists', 409);
            }
            existingPerson.name = name;
          }

          if (countryCode) {
            const country = await countryRepository.findOneBy({ code: countryCode });
            if (!country) {
              throw new NotFoundError(`Country with code '${countryCode}' not found`);
            }
            existingPerson.country = country;
          }

          if (bios) {
            const languages = await languageRepository.findBy({
              code: In(bios.map((bio) => bio.languageCode.toUpperCase())),
            });

            const languagesMap = new Map<string, LanguageEntity>(languages.map((lang) => [lang.code, lang]));

            const missingLanguage = bios.find((bio) => !languagesMap.has(bio.languageCode.toUpperCase()));

            if (missingLanguage) {
              throw new NotFoundError(`Language with code '${missingLanguage.languageCode}' not found`);
            }

            // Delete existing bios
            if (existingPerson.bios) {
              await bioRepository.remove(existingPerson.bios);
            }

            // Create new bios
            const newBios = bios.map((b) => {
              const newBio = new BioEntity();
              newBio.language = languagesMap.get(b.languageCode.toUpperCase())!;
              newBio.bio = b.bio;
              newBio.person = existingPerson;
              return newBio;
            });

            await bioRepository.save(newBios);
            existingPerson.bios = newBios;
          }

          await personRepository.save(existingPerson);
          return existingPerson;
        });

        return res.status(200).send({
          type: 'person',
          id: updatedPerson.id,
          attributes: {
            name: updatedPerson.name,
            countryCode,
            bios: updatedPerson.bios?.map((bio) => ({
              bio: bio.bio,
              languageCode: bio.language.code,
            })),
          },
        });
      },
    });
  };

function updatePersonSchema() {
  return {
    description: 'Update person.',
    tags: ['persons'] as string[],
    params: Type.Object({
      id: Type.String(),
    }),
    body: Type.Object({
      data: Type.Object({
        type: Type.Literal('person'),
        attributes: Type.Object({
          name: Type.Optional(Type.String()),
          countryCode: Type.String(),
          bios: Type.Optional(
            Type.Array(
              Type.Object({
                languageCode: Type.String(),
                bio: Type.String(),
              })
            )
          ),
        }),
      }),
    }),
    response: {
      200: Type.Object({
        type: Type.Literal('person'),
        id: Type.String(),
        attributes: personSchema,
      }),
    },
  };
}
