import { FastifyInstance } from 'fastify';
import { DataSource } from 'typeorm';
import { PersonEntity } from '../../db/entities/Person';
import { Type, TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import { personSchema } from './person.schema';

export const registerGetPersonsController =
  (app: FastifyInstance) =>
  ({ dbConnection }: { dbConnection: DataSource }) => {
    app.withTypeProvider<TypeBoxTypeProvider>().route({
      method: 'GET',
      url: '/persons',
      schema: getPersonsSchema(),
      handler: async (req, res) => {
        const personRepository = dbConnection.getRepository(PersonEntity);
        const persons = await personRepository.find({ relations: ['bios', 'bios.language', 'country'] });
        const response = persons
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((person) => ({
            type: 'person' as const,
            id: person.id,
            attributes: {
              name: person.name,
              countryCode: person.country?.code || '',
              bios:
                person.bios?.map((bio) => ({
                  bio: bio.bio,
                  languageCode: bio.language.code,
                })) || [],
            },
          }));
        return res.status(200).send(response);
      },
    });
  };

function getPersonsSchema() {
  return {
    response: {
      200: Type.Array(
        Type.Object({
          type: Type.Literal('person'),
          id: Type.String(),
          attributes: personSchema,
        })
      ),
    },
  };
}
