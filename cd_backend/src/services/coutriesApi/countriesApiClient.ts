import axios, { AxiosError, AxiosInstance } from 'axios';
import axiosRetry, { IAxiosRetryConfig } from 'axios-retry';
import { FastifyBaseLogger } from 'fastify';

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
  ({
    baseUrl,
    apiKey,
    retry = { retries: 3, shouldResetTimeout: true, retryCondition: shouldRetry },
  }: {
    baseUrl: string;
    apiKey: string;
    retry?: IAxiosRetryConfig;
  }) => {
    const serviceLogger = logger.child({ serviceName: 'country_layer' });

    const countryAxios = axios.create({
      baseURL: baseUrl,
      params: {
        access_key: apiKey,
      },
    });

    axiosRetry(countryAxios, retry);

    return createGetEuropeanCountries({ axios: countryAxios, logger: serviceLogger });
  };

const shouldRetry: (error: AxiosError) => boolean = (err) => axiosRetry.isNetworkOrIdempotentRequestError(err);

const createGetEuropeanCountries = ({ axios, logger }: { axios: AxiosInstance; logger: FastifyBaseLogger }) => ({
  async getEuropeanCountries() {
    try {
      const res = await axios.get<CountryData[]>('/region/Europe');

      return res.data;
    } catch (err) {
      logger.error({ err }, 'Error while fetching countries.');
      throw err;
    }
  },
});
