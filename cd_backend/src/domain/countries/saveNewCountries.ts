import { FastifyBaseLogger } from 'fastify';
import { DataSource } from 'typeorm';
import { CountryData } from '../../services/coutriesApi/countriesApiClient';
import { CountryEntity } from '../../db/entities/Country';
import { NameEntity } from '../../db/entities/Name';
import { LanguageEntity } from '../../db/entities/Language';

export const saveNewCountries =
  ({ dbConnection, logger }: { dbConnection: DataSource; logger: FastifyBaseLogger }) =>
  async (countriesData: Pick<CountryData, 'name' | 'alpha2Code'>[]) => {
    const newCountries: CountryEntity[] = [];

    await dbConnection.transaction(async (entityManager) => {
      const countriesRepo = entityManager.getRepository(CountryEntity);
      const languageRepo = entityManager.getRepository(LanguageEntity);

      let englishLanguage = await languageRepo.findOne({ where: { code: 'EN' } });
      if (!englishLanguage) {
        englishLanguage = new LanguageEntity();
        englishLanguage.name = 'English';
        englishLanguage.code = 'EN';
        await languageRepo.save(englishLanguage);
      }

      for (const country of countriesData) {
        const isAlreadyInDb = await countriesRepo.exists({ where: { code: country.alpha2Code } });

        if (!isAlreadyInDb) {
          const { name, alpha2Code } = country;

          const newCountry = new CountryEntity();
          const englishName = new NameEntity();
          englishName.name = name;
          englishName.type = 'Country';
          englishName.language = englishLanguage;

          const newNames = [englishName];

          newCountry.names = newNames;
          newCountry.code = alpha2Code.toUpperCase();

          newCountries.push(newCountry);
        }
      }

      await entityManager.save(CountryEntity, newCountries);
    });

    logger.info({ newCountries: newCountries.map((country) => country.names?.[0]?.name) }, 'New countries saved in DB');
  };
