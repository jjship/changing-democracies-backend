import { FastifyBaseLogger } from 'fastify';
import { DataSource } from 'typeorm';
import { CountryData } from '../../services/coutriesApi/countriesApiClient';
import { LanguageEntity } from '../../db/entities/Language';

export const saveNewLanguages = async ({
  dbConnection,
  logger,
}: {
  dbConnection: DataSource;
  logger: FastifyBaseLogger;
}) => {
  const languagesData = [
    { name: 'Catalan', code: 'CA' },
    { name: 'Croatian', code: 'HR' },
    { name: 'Czech', code: 'CS' },
    { name: 'Dutch', code: 'NL' },
    { name: 'English', code: 'EN' },
    { name: 'French', code: 'FR' },
    { name: 'German', code: 'DE' },
    { name: 'Greek', code: 'EL' },
    { name: 'Lithuanian', code: 'LT' },
    { name: 'Polish', code: 'PL' },
    { name: 'Portuguese', code: 'PT' },
    { name: 'Romanian', code: 'RO' },
    { name: 'Spanish', code: 'ES' },
  ];

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
