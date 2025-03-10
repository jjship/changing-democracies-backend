import 'reflect-metadata';
import { ConnectionNotFoundError, DataSource, DataSourceOptions } from 'typeorm';
import { ENV } from '../env';
import path from 'path';

export { createDbConnection, getDbConnection };

const dataSourceOptions: DataSourceOptions = {
  type: 'sqlite',
  database: path.join(process.cwd(), 'data', 'database.sqlite'),
  synchronize: ENV.NODE_ENV !== 'production',
  logging: ENV.NODE_ENV === 'development' ? ['error', 'schema', 'warn', 'info'] : ['error'],
  entities: [`${__dirname}/entities/*.{js,ts}`],
  migrations: [`${__dirname}/migrations/*.{js,ts}`],
  migrationsRun: true,
};

let dataSource: DataSource | undefined;

async function createDbConnection(options?: Partial<DataSourceOptions>) {
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
