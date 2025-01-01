import { createDbConnection } from './db/db';
import { createBunnyStreamClient } from './services/bunnyStream/bunnyStreamApiClient';
import { ENV } from './env';
import { syncFragments } from './domain/fragments/syncFragments';
import { logger } from './services/logger/logger';

async function main() {
  const dbConnection = await createDbConnection();
  const bunnyStream = createBunnyStreamClient({ logger: logger })({
    baseUrl: ENV.BUNNY_STREAM_BASE_URL,
    apiKey: ENV.BUNNY_STREAM_API_KEY,
    libraryId: ENV.BUNNY_STREAM_LIBRARY_ID,
    collectionId: ENV.BUNNY_STREAM_COLLECTION_ID,
  });

  await syncFragments({ dbConnection, bunnyStream, logger });
}
