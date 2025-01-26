import { FastifyBaseLogger } from 'fastify';
import { DataSource } from 'typeorm';
import { CountriesApiClient, CountryData } from '../services/coutriesApi/countriesApiClient';
import { saveNewCountries } from './countries/saveNewCountries';
import { saveNewLanguages } from './languages/saveNewLanguages';
import { ENV } from '../env';

export const syncCountriesAndLanguages = async ({
  dbConnection,
  countriesApiClient,
  logger,
}: {
  dbConnection: DataSource;
  countriesApiClient: CountriesApiClient;
  logger: FastifyBaseLogger;
}) => {
  const countriesData =
    ENV.NODE_ENV === 'production' ? await countriesApiClient.getEuropeanCountries() : getBaseCountries();

  await saveNewLanguages({ dbConnection, logger });

  await saveNewCountries({ dbConnection, logger })(countriesData);
};

function getBaseCountries() {
  const countriesCodes = [
    { name: 'Belgium', code: 'BE' },
    { name: 'Croatia', code: 'HR' },
    { name: 'Czech Republic', code: 'CZ' },
    { name: 'Netherlands', code: 'NL' },
    { name: 'France', code: 'FR' },
    { name: 'Germany', code: 'DE' },
    { name: 'Greece', code: 'GR' },
    { name: 'Lithuania', code: 'LT' },
    { name: 'Poland', code: 'PL' },
    { name: 'Portugal', code: 'PT' },
    { name: 'Romania', code: 'RO' },
    { name: 'Spain', code: 'ES' },
  ];

  return countriesCodes.reduce(
    (acc, country) => {
      acc.push({ name: country.name, alpha2Code: country.code });

      return acc;
    },
    [] as Pick<CountryData, 'name' | 'alpha2Code'>[]
  );
}
