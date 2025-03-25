import { DataSourceOptions } from 'typeorm';
import path from 'path';
import { ENV } from '../env';

/**
 * Get the appropriate database configuration based on environment
 */
export function getDataSourceOptions(): DataSourceOptions {
  // Use PostgreSQL when USE_NEON_DB is true (for both production and development)
  if (ENV.USE_NEON_DB) {
    const isProduction = ENV.NODE_ENV === 'production';

    return {
      type: 'postgres',
      host: ENV.NEON_DB_HOST,
      port: parseInt(ENV.NEON_DB_PORT || '5432'),
      username: ENV.NEON_DB_USERNAME,
      password: ENV.NEON_DB_PASSWORD,
      database: ENV.NEON_DB_DATABASE,
      ssl: ENV.NEON_DB_SSL,
      synchronize: false, // Disable synchronize and use migrations instead
      logging: isProduction ? ['error'] : ['error', 'schema', 'warn', 'info'],
      entities: [`${__dirname}/entities/*.{js,ts}`],
      migrations: [`${__dirname}/migrations/*.{js,ts}`],
      migrationsRun: true,
      // Connection pool settings optimized for Neon
      poolSize: isProduction ? 20 : 10, // More connections in production
      extra: {
        max: isProduction ? 40 : 20, // Maximum number of connections in the pool
        idleTimeoutMillis: 30000, // Close idle connections after 30 seconds
        connectionTimeoutMillis: 5000, // Connection timeout after 2 seconds
        ssl: {
          rejectUnauthorized: true, // Required for Neon
        },
      },
    } as DataSourceOptions;
  }

  // Default SQLite configuration
  return {
    type: 'sqlite',
    database: path.join(process.cwd(), 'data', 'database.sqlite'),
    synchronize: false, // Disable synchronize and use migrations instead
    logging: ENV.NODE_ENV === 'development' ? ['error', 'schema', 'warn', 'info'] : ['error'],
    entities: [`${__dirname}/entities/*.{js,ts}`],
    migrations: [`${__dirname}/migrations/*.{js,ts}`],
    migrationsRun: true,
  } as DataSourceOptions;
}
