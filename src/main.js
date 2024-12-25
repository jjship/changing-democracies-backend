import pg from 'pg';

const pool = new pg.Pool({
  host: process.env.POSTGRES_HOST,
  port: process.env.POSTGRES_PORT,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DB,
});

async function main() {
  const dbClient = await pool.connect();

  try {
    const { rows } = await dbClient.query('SELECT * FROM fragments');
    console.log({ rows });
  } catch (err) {
    console.error({ err });
  } finally {
    dbClient.release();
  }
}

main()
  .then(console.log('Connected to db!'))
  .catch((err) => console.error('Error connecting to db', { err }));
