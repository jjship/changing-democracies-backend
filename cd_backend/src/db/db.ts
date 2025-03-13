import 'reflect-metadata';
import { ConnectionNotFoundError, DataSource, DataSourceOptions } from 'typeorm';
import { getDataSourceOptions } from './dbConfig';

export { createDbConnection, getDbConnection };

let dataSource: DataSource | undefined;

async function createDbConnection(options?: Partial<DataSourceOptions>) {
  const dataSourceOptions = getDataSourceOptions();

  dataSource = new DataSource({
    ...dataSourceOptions,
    ...options,
  } as DataSourceOptions);

  const connection = await dataSource.initialize();
  return connection;
}

function getDbConnection() {
  if (!dataSource) {
    throw new ConnectionNotFoundError('default');
  }

  return dataSource;
}
