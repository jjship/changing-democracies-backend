import { FastifyInstance } from 'fastify';
import { Type, TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import { DataSource } from 'typeorm';
import { PersonEntity } from '../../db/entities/Person';
import { CountryEntity } from '../../db/entities/Country';
import { personSchema, createPersonSchema, updatePersonSchema } from './person.schema';
import { NotFoundError } from '../../errors';

export const registerPersonControllers =
  (app: FastifyInstance) =>
  ({ dbConnection }: { dbConnection: DataSource }) => {
    app.withTypeProvider<TypeBoxTypeProvider>().route({
      method: 'POST',
      url: '/persons',
      schema: {
        body: createPersonSchema,
        response: {
          201: personSchema,
        },
      },
      handler: async (request, reply) => {
        const person = new PersonEntity();
        person.name = request.body.name;

        if (request.body.countryId) {
          const country = await dbConnection.getRepository(CountryEntity).findOneByOrFail({
            id: request.body.countryId,
          });
          person.country = country;
        }

        await dbConnection.getRepository(PersonEntity).save(person);

        return reply.status(201).send({
          id: person.id,
          name: person.name,
          countryId: person.country?.id,
        });
      },
    });

    app.withTypeProvider<TypeBoxTypeProvider>().route({
      method: 'PUT',
      url: '/persons/:id',
      schema: {
        params: Type.Object({
          id: Type.String(),
        }),
        body: updatePersonSchema,
        response: {
          200: personSchema,
        },
      },
      handler: async (request, reply) => {
        const personRepo = dbConnection.getRepository(PersonEntity);

        const person = await personRepo.findOne({
          where: { id: request.params.id },
          relations: ['country'],
        });

        if (!person) {
          throw new NotFoundError('Person not found');
        }

        person.name = request.body.name;

        if (request.body.countryId) {
          const country = await dbConnection.getRepository(CountryEntity).findOneByOrFail({
            id: request.body.countryId,
          });
          person.country = country;
        } else {
          person.country = undefined;
        }

        await personRepo.save(person);

        return reply.send({
          id: person.id,
          name: person.name,
          countryId: person.country?.id,
        });
      },
    });

    app.withTypeProvider<TypeBoxTypeProvider>().route({
      method: 'GET',
      url: '/persons',
      schema: {
        response: {
          200: Type.Array(personSchema),
        },
      },
      handler: async (_, reply) => {
        const persons = await dbConnection.getRepository(PersonEntity).find({
          relations: ['country'],
        });

        return reply.send(
          persons.map((person) => ({
            id: person.id,
            name: person.name,
            countryId: person.country?.id,
          }))
        );
      },
    });

    app.withTypeProvider<TypeBoxTypeProvider>().route({
      method: 'DELETE',
      url: '/persons/:id',
      schema: {
        params: Type.Object({
          id: Type.String(),
        }),
        response: {
          204: Type.Null(),
        },
      },
      handler: async (request, reply) => {
        await dbConnection.getRepository(PersonEntity).delete(request.params.id);
        return reply.status(204).send();
      },
    });
  };
