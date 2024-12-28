import 'reflect-metadata';
import { ConnectionNotFoundError, DataSource, DataSourceOptions } from 'typeorm';
import { env } from '../env';

export { createDbConnection, getDbConnection };

const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: env.DB_HOST,
  port: env.DB_PORT,
  database: env.DB_DATABASE,
  username: env.DB_USER,
  password: env.DB_PASSWORD,
  synchronize: env.NODE_ENV !== 'production',
  logging: env.NODE_ENV === 'development' ? ['query', 'error', 'schema', 'warn', 'info', 'log'] : ['error'],
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
