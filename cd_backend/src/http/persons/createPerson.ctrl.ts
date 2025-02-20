import { Type, TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import { FastifyInstance } from 'fastify';
import { DataSource, In } from 'typeorm';
import { LanguageEntity } from '../../db/entities/Language';
import { personSchema } from './person.schema';
import { PersonEntity } from '../../db/entities/Person';
import { BioEntity } from '../../db/entities/Bio';
import { CountryEntity } from '../../db/entities/Country';
import { HttpError } from '../../errors';
import { normalizeName } from '../../utils/normalizeName';

export const registerCreatePersonController =
  (app: FastifyInstance) =>
  ({ dbConnection }: { dbConnection: DataSource }) => {
    app.withTypeProvider<TypeBoxTypeProvider>().route({
      method: 'POST',
      url: '/persons',
      schema: createPersonSchema(),
      handler: async (req, res) => {
        const { name, bios, countryCode } = req.body.data.attributes;

        const newPerson = await dbConnection.transaction(async (entityManager) => {
          const personRepository = entityManager.getRepository(PersonEntity);
          const languageRepository = entityManager.getRepository(LanguageEntity);
          const bioRepository = entityManager.getRepository(BioEntity);
          const countryRepository = entityManager.getRepository(CountryEntity);

          const existingPerson = await personRepository.findOne({ where: { normalizedName: normalizeName(name) } });

          if (existingPerson) {
            throw new HttpError('Person already exists', 409);
          }

          const country = await countryRepository.findOneBy({ code: countryCode });

          if (!country) {
            throw new HttpError('Country not found', 404);
          }

          const languages = await languageRepository.findBy({
            code: In(bios.map((bio) => bio.languageCode.toUpperCase())),
          });

          const languagesMap = new Map<string, LanguageEntity>(languages.map((lang) => [lang.code, lang]));

          const missingLanguage = bios.find((bio) => !languagesMap.has(bio.languageCode.toUpperCase()));

          if (missingLanguage) {
            throw new HttpError(`Language with code '${missingLanguage.languageCode}' not found`, 404);
          }

          const newPerson = personRepository.create();
          newPerson.name = name;
          newPerson.country = country;
          newPerson.normalizedName = normalizeName(name);

          const newBios = bios.map((b) => {
            const newBio = new BioEntity();
            newBio.language = languagesMap.get(b.languageCode.toUpperCase())!;
            newBio.bio = b.bio;
            return newBio;
          });

          await bioRepository.save(newBios);

          newPerson.bios = newBios;
          await personRepository.save(newPerson);

          return newPerson;
        });

        return res.status(200).send({
          type: 'person',
          id: newPerson.id,
          attributes: {
            name: newPerson.name,
            countryCode: countryCode,
            bios: newPerson.bios?.map((bio) => ({ bio: bio.bio, languageCode: bio.language.code })),
          },
        });
      },
    });
  };

function createPersonSchema() {
  return {
    description: 'Create new person.',
    tags: ['persons'] as string[],
    body: Type.Object({
      data: Type.Object({
        type: Type.Literal('person'),
        attributes: Type.Object({
          name: Type.String(),
          countryCode: Type.String(),
          bios: Type.Array(Type.Object({ languageCode: Type.String(), bio: Type.String() })),
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
