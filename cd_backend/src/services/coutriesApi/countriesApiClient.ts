import { FastifyBaseLogger } from 'fastify';
import { createFetchClient, HttpClient, RetryOptions } from '../http/fetchClient';

export { createCountryLayerApiClient };

export type CountriesApiClient = ReturnType<ReturnType<typeof createCountryLayerApiClient>>;

export type CountryData = {
  name: string;
  topLevelDomain: string[];
  alpha2Code: string;
  alpha3Code: string;
  callingCodes: string[];
  capital: string;
  altSpellings: string[];
  region: string;
};

const createCountryLayerApiClient =
  ({ logger }: { logger: FastifyBaseLogger }) =>
  ({ baseUrl, apiKey, retry }: { baseUrl: string; apiKey: string; retry?: RetryOptions }) => {
    const serviceLogger = logger.child({ serviceName: 'country_layer' });

    const http = createFetchClient({ baseUrl, retry, logger: serviceLogger });

    return createGetEuropeanCountries({ http, apiKey, logger: serviceLogger });
  };

const createGetEuropeanCountries = ({
  http,
  apiKey,
  logger,
}: {
  http: HttpClient;
  apiKey: string;
  logger: FastifyBaseLogger;
}) => ({
  async getEuropeanCountries() {
    try {
      return await http.get<CountryData[]>('/region/Europe', { query: { access_key: apiKey } });
    } catch (err) {
      logger.error({ err }, 'Error while fetching countries.');
      throw err;
    }
  },
});
