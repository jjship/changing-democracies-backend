import 'reflect-metadata';
import { ConnectionNotFoundError, DataSource, DataSourceOptions } from 'typeorm';
import { ENV } from '../env';

export { createDbConnection, getDbConnection };

const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: ENV.DB_HOST,
  port: ENV.DB_PORT,
  database: ENV.DB_DATABASE,
  username: ENV.DB_USER,
  password: ENV.DB_PASSWORD,
  synchronize: ENV.NODE_ENV !== 'production',
  logging: ENV.NODE_ENV === 'development' ? ['query', 'error', 'schema', 'warn', 'info', 'log'] : ['error'],
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
