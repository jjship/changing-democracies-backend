import 'reflect-metadata';
import { ConnectionNotFoundError, DataSource, DataSourceOptions } from 'typeorm';
import { logger } from '../services/logger/logger';
import { getDataSourceOptions } from './dbConfig';

export { createDbConnection, getDbConnection };

let dataSource: DataSource | undefined;

async function createDbConnection(options?: Partial<DataSourceOptions>) {
  const dataSourceOptions = getDataSourceOptions();

  // Add longer connection timeout for Neon DB
  const connectionOptions = {
    ...dataSourceOptions,
    ...options,
    connectTimeoutMS: 30000, // 30 seconds timeout
  } as DataSourceOptions;

  dataSource = new DataSource(connectionOptions);

  // Add retry logic
  let retries = 5;
  let lastError: unknown;

  while (retries > 0) {
    try {
      logger.info(`Attempting database connection. Retries left: ${retries}`);
      const connection = await dataSource.initialize();
      logger.info('Database connection established successfully');
      return connection;
    } catch (err) {
      lastError = err;
      logger.warn(
        `Failed to connect to database. Retrying in 2 seconds. Error: ${err instanceof Error ? err.message : 'Unknown error'}`,
      );
      retries--;

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  // If we've exhausted all retries, throw the last error
  throw lastError;
}

function getDbConnection() {
  if (!dataSource) {
    throw new ConnectionNotFoundError('default');
  }

  return dataSource;
}
