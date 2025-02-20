import { FastifyInstance, FastifyRequest, RouteGenericInterface } from 'fastify';
import { DataSource, Repository } from 'typeorm';
import { PersonEntity } from '../../db/entities/Person';
import { NotFoundError } from '../../errors';
import { Type, TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import { personSchema } from './person.schema';

interface FindPersonParams extends RouteGenericInterface {
  Querystring: {
    id?: string;
    name?: string;
  };
}

export const registerFindPersonController =
  (app: FastifyInstance) =>
  ({ dbConnection }: { dbConnection: DataSource }) => {
    app.withTypeProvider<TypeBoxTypeProvider>().route({
      method: 'GET',
      url: '/person',
      schema: findPersonSchema(),
      handler: async (req: FastifyRequest<FindPersonParams>, res) => {
        const personRepository = dbConnection.getRepository(PersonEntity);
        const person = await findPerson(personRepository, req.query.id, req.query.name);

        if (!person) {
          throw new NotFoundError(`Person not found`);
        }

        return res.status(200).send({
          type: 'person',
          id: person.id,
          attributes: {
            name: person.name,
            countryCode: person.country?.code || '',
            bios: person.bios?.map((bio: any) => ({
              bio: bio.bio,
              languageCode: bio.language.code,
            })),
          },
        });
      },
    });
  };

function findPersonSchema() {
  return {
    querystring: Type.Object({
      id: Type.Optional(Type.String()),
      name: Type.Optional(Type.String()),
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

async function findPerson(
  personRepository: Repository<PersonEntity>,
  id?: string,
  name?: string
): Promise<PersonEntity | null> {
  if (id) {
    return await personRepository.findOne({
      where: { id },
      relations: ['bios', 'bios.language', 'country'],
    });
  } else if (name) {
    return await personRepository.findOne({
      where: { name },
      relations: ['bios', 'bios.language', 'country'],
    });
  }
  return null;
}
