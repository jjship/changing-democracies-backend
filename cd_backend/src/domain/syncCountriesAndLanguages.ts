import { FastifyBaseLogger } from 'fastify';
import { DataSource } from 'typeorm';
import { CountriesApiClient } from '../services/coutriesApi/countriesApiClient';
import { saveNewCountries } from './countries/saveNewCountries';
import { saveNewLanguages } from './languages/saveNewLanguages';

export const syncCountriesAndLanguages = async ({
  dbConnection,
  countriesApiClient,
  logger,
}: {
  dbConnection: DataSource;
  countriesApiClient: CountriesApiClient;
  logger: FastifyBaseLogger;
}) => {
  const countriesData = await countriesApiClient.getEuropeanCountries();

  await saveNewCountries({ dbConnection, logger })(countriesData);

  await saveNewLanguages({ dbConnection, logger })(countriesData);
};
