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
  subregion: string;
  population: number;
  latlng: [number, number];
  demonym: string;
  area: number;
  gini: number;
  timezones: string[];
  borders: string[];
  nativeName: string;
  numericCode: string;
  currencies: {
    code: string;
    name: string;
    symbol: string;
  }[];
  languages: {
    iso639_1: string;
    iso639_2: string;
    name: string;
    nativeName: string;
  }[];
  translations: {
    [key: string]: string;
  };
  flag: string;
  regionalBlocs: {
    acronym: string;
    name: string;
  }[];
  cioc: string;
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
      const res = await axios.get<CountryData[]>('/region/europe');

      return res.data;
    } catch (err) {
      logger.error({ err }, 'Error while fetching countries.');
      throw err;
    }
  },
});
