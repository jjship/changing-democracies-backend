import { createDbConnection } from './db/db';
import { createBunnyStreamClient } from './services/bunnyStream/bunnyStreamApiClient';
import { ENV } from './env';
import { syncFragments } from './domain/fragments/fragments.api';
import { logger } from './services/logger/logger';
import { setupApp } from './app';
import { createCountryLayerApiClient } from './services/coutriesApi/countriesApiClient';
import { syncCountriesAndLanguages } from './domain/syncCountriesAndLanguages';
import { syncLegacyFragments } from './domain/fragments/syncLegacyFragments';

main();

async function main() {
  try {
    const dbConnection = await createDbConnection();
    const bunnyStream = createBunnyStreamClient({ logger })({
      baseUrl: ENV.BUNNY_STREAM_BASE_URL,
      apiKey: ENV.BUNNY_STREAM_API_KEY,
      libraryId: ENV.BUNNY_STREAM_LIBRARY_ID,
      collectionId: ENV.BUNNY_STREAM_COLLECTION_ID,
    });
    const countriesApiClient = createCountryLayerApiClient({ logger })({
      baseUrl: ENV.COUNTRY_LAYER_BASE_URL,
      apiKey: ENV.COUNTRY_LAYER_API_KEY,
    });

    if (ENV.SYNC_COUNTRIES) {
      await syncCountriesAndLanguages({ dbConnection, countriesApiClient, logger });
    }

    // await syncFragments({ dbConnection, bunnyStream, logger });

    if (ENV.SYNC_LEGACY_FRAGMENTS) {
      await syncLegacyFragments({ dbConnection, bunnyStream, logger });
    }

    const app = await setupApp({ dbConnection, bunnyStream });

    await app.listen({ port: ENV.BACKEND_PORT, host: ENV.BACKEND_HOST });
  } catch (err) {
    logger.fatal(err);

    process.exit(1);
  }
}
