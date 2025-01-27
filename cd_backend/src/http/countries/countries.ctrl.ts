import { FastifyInstance } from 'fastify';
import { Type, TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import { DataSource } from 'typeorm';
import { CountryEntity } from '../../db/entities/Country';
import { NameEntity } from '../../db/entities/Name';
import { countrySchema, createCountrySchema, updateCountrySchema } from './country.schema';
import { LanguageEntity } from '../../db/entities/Language';
import { errorResponseSchema, NotFoundError } from '../../errors';

export const registerCountryControllers =
  (app: FastifyInstance) =>
  ({ dbConnection }: { dbConnection: DataSource }) => {
    app.withTypeProvider<TypeBoxTypeProvider>().route({
      method: 'POST',
      url: '/countries',
      schema: {
        body: createCountrySchema,
        response: {
          201: countrySchema,
        },
      },
      handler: async (request, reply) => {
        const country = new CountryEntity();

        // Create names with proper language relations
        const names = await Promise.all(
          request.body.names.map(async (n) => {
            const language = await dbConnection.getRepository(LanguageEntity).findOneByOrFail({
              code: n.languageCode,
            });

            const name = new NameEntity();
            name.language = language;
            name.name = n.name;
            name.type = 'Country';
            name.country = country;
            return name;
          })
        );

        country.names = names;
        if (request.body.code) {
          country.code = request.body.code.toUpperCase();
        } else {
          const englishLanguage = await dbConnection.getRepository(LanguageEntity).findOneByOrFail({
            code: 'EN',
          });
          const englishName = new NameEntity();
          englishName.language = englishLanguage;
          englishName.name = request.body.names[0].name;
          englishName.type = 'Country';
          englishName.country = country;
          country.names.push(englishName);
        }

        await dbConnection.getRepository(CountryEntity).save(country);

        // Format response according to schema
        return reply.status(201).send({
          id: country.id,
          names: country.names.map((n) => ({
            languageCode: n.language.code,
            name: n.name,
          })),
          code: country.code,
        });
      },
    });

    app.withTypeProvider<TypeBoxTypeProvider>().route({
      method: 'PUT',
      url: '/countries/:id',
      schema: {
        params: Type.Object({
          id: Type.String(),
        }),
        body: updateCountrySchema,
        response: {
          200: countrySchema,
        },
      },
      handler: async (request, reply) => {
        const countryRepo = dbConnection.getRepository(CountryEntity);
        const nameRepo = dbConnection.getRepository(NameEntity);

        // Find existing country
        const country = await countryRepo.findOne({
          where: { id: request.params.id },
          relations: ['names', 'names.language'],
        });

        if (!country) {
          throw new NotFoundError('Country not found');
        }

        // Delete existing names
        if (country.names) {
          await nameRepo.remove(country.names);
        }

        // Create new names if not already in the database
        const names = await Promise.all(
          request.body.names.map(async (n) => {
            const existingName = await nameRepo.findOne({
              where: { name: n.name, language: { code: n.languageCode }, type: 'Country' },
              relations: ['language'],
            });

            if (existingName) {
              return existingName;
            }

            const language = await dbConnection.getRepository(LanguageEntity).findOneByOrFail({
              code: n.languageCode,
            });

            const name = new NameEntity();
            name.language = language;
            name.name = n.name;
            name.type = 'Country';
            name.country = country;
            return name;
          })
        );

        country.names = names;
        if (request.body.code) {
          country.code = request.body.code.toUpperCase();
        } else {
          const englishLanguage = await dbConnection.getRepository(LanguageEntity).findOneByOrFail({
            code: 'EN',
          });
          const englishName = new NameEntity();
          englishName.language = englishLanguage;
          englishName.name = request.body.names[0].name;
          englishName.type = 'Country';
          englishName.country = country;
          country.names.push(englishName);
        }

        await countryRepo.save(country);

        return reply.send({
          id: country.id,
          names: country.names.map((n) => ({
            languageCode: n.language.code,
            name: n.name,
          })),
          code: country.code,
        });
      },
    });

    app.withTypeProvider<TypeBoxTypeProvider>().route({
      method: 'DELETE',
      url: '/countries/:id',
      schema: {
        params: Type.Object({
          id: Type.String(),
        }),
        response: {
          204: Type.Null(),
        },
      },
      handler: async (request, reply) => {
        await dbConnection.getRepository(CountryEntity).delete(request.params.id);
        return reply.status(204).send();
      },
    });

    app.withTypeProvider<TypeBoxTypeProvider>().route({
      method: 'GET',
      url: '/countries',
      schema: {
        response: {
          200: Type.Array(countrySchema),
        },
      },
      handler: async (request, reply) => {
        const countries = await dbConnection.getRepository(CountryEntity).find({
          relations: ['names', 'names.language'],
        });

        return reply.send(
          countries.map((country) => ({
            id: country.id,
            names: (country.names ?? []).map((n) => ({
              languageCode: n.language.code,
              name: n.name,
            })),
            code: country.code,
          }))
        );
      },
    });
  };
