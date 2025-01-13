import { FastifyBaseLogger } from 'fastify';
import { DataSource } from 'typeorm';
import { CountryData } from '../../services/coutriesApi/countriesApiClient';
import { LanguageEntity } from '../../db/entities/Language';
import { getLanguages } from './getLanguages';

export const saveNewLanguages =
  ({ dbConnection, logger }: { dbConnection: DataSource; logger: FastifyBaseLogger }) =>
  async (countriesData: CountryData[]) => {
    const languagesData = getLanguages(countriesData);

    const languagesRepo = dbConnection.getRepository(LanguageEntity);

    const newLanguages = [];
    for (const language of languagesData) {
      const { name, code } = language;
      if (!(await languagesRepo.exists({ where: { code } }))) {
        const newLanguage = new LanguageEntity();
        newLanguage.name = name;
        newLanguage.code = code.toUpperCase();

        newLanguages.push({ name, code });

        await languagesRepo.save(newLanguage);
      }
    }

    logger.info({ newLanguages }, 'New languages saved in DB');
  };
