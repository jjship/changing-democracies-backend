# Changing Democracies Backend

## Running Tests

### Integration Tests with PostgreSQL

The integration tests are configured to use PostgreSQL from the Docker Compose setup. By default, they will connect to a PostgreSQL instance with the following configuration:

- Host: postgres (Docker service name)
- Port: 5432
- User: postgres
- Password: postgres
- Database: cd_backend_test
- SSL: disabled (for Docker development)

To run the tests:

```bash
# First, make sure the Docker Compose PostgreSQL container is running:
docker-compose up -d postgres

# Then run the tests
npm run test:integration

# To run tests with watch mode, you can add the --watch flag
npm run test:integration -- --watch

# Or run tests directly in Docker
docker compose run --rm cd_backend npm run test:integration
```

You can override any database connection settings by setting environment variables:

```bash
DB_HOST=localhost DB_USERNAME=custom-user DB_PASSWORD=custom-password npm run test:integration
```

### Test Database Optimization

The test setup has been optimized for both consistency with production and performance:

1. **Database Creation**: The test database (`cd_backend_test`) is created if it doesn't exist
2. **Intelligent Schema Creation**:
   - First test run in a session applies migrations (like production)
   - Subsequent tests reuse the same schema without reapplying migrations
3. **Fast Test Resets**: Between tests, tables are truncated but schema remains intact
4. **Production Compatibility**: Uses the same migration files as production
5. **No Schema Synchronization**: Avoids automatic schema generation based on entities

This approach ensures tests are run against the same schema as production while keeping test execution fast.

### Environment Configuration

A sample test environment configuration is available in `.env.test.example`. You can copy this file to create a local `.env.test` with your preferred settings.

### Notes

- For production and development environments, the `USE_NEON_DB=true` flag may be used to connect to Neon DB.
- For tests, we're using the local Docker PostgreSQL instance to avoid affecting production data.
- SSL is explicitly disabled for the test database connection to work with the Docker PostgreSQL instance, which doesn't have SSL enabled by default.
