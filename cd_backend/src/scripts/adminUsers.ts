/** CMS admin account CLI (see USAGE). Production container: node scripts/adminUsers.js <command> */
import { readFileSync } from 'fs';
import { parseArgs } from 'util';
import { createDbConnection } from '../db/db';
import { ENV } from '../env';
import { logger } from '../services/logger/logger';
import { createResendMailer, Mailer } from '../services/mailer/mailer';
import { createAdminUser, deleteAdminUser, findAdminUserByEmail, listAdminUsers } from '../domain/auth/adminUsers';
import { buildPasswordSetupUrl, createPasswordResetToken } from '../domain/auth/passwordReset';
import { PASSWORD_MIN_LENGTH } from '../auth/password';
import { HttpError } from '../errors';

const USAGE = `Usage:
  admin-users list
  admin-users create --email <email> --name <name> [--password <password>] [--no-invite]
  admin-users import --csv <file> [--no-invite]     CSV columns: email,name (header row optional)
  admin-users delete --email <email>

Without --password an invite email with a set-password link is sent (skip with --no-invite).
The link is always printed so it can be shared by other means.`;

const COMMANDS = ['list', 'create', 'import', 'delete'];

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      email: { type: 'string' },
      name: { type: 'string' },
      password: { type: 'string' },
      csv: { type: 'string' },
      'no-invite': { type: 'boolean', default: false },
    },
  });

  const command = positionals[0];
  if (!command || !COMMANDS.includes(command)) {
    console.log(USAGE);
    process.exit(command ? 1 : 0);
  }

  const dbConnection = await createDbConnection();
  const mailer = createResendMailer({ apiKey: ENV.RESEND_API_KEY, from: ENV.AUTH_EMAIL_FROM, logger });
  const sendInvite = !values['no-invite'];

  try {
    switch (command) {
      case 'list': {
        const users = await listAdminUsers({ dbConnection });
        for (const user of users) {
          console.log(`${user.email}\t${user.name}\t${user.passwordHash ? 'password set' : 'invite pending'}`);
        }
        console.log(`${users.length} admin user(s)`);
        break;
      }
      case 'create': {
        if (!values.email || !values.name) {
          throw new Error('create requires --email and --name');
        }
        if (values.password !== undefined && values.password.length < PASSWORD_MIN_LENGTH) {
          throw new Error(`Password must be at least ${PASSWORD_MIN_LENGTH} characters`);
        }
        await createUser({
          dbConnection,
          mailer,
          email: values.email,
          name: values.name,
          password: values.password,
          sendInvite,
        });
        break;
      }
      case 'import': {
        if (!values.csv) {
          throw new Error('import requires --csv <file>');
        }
        for (const row of readCsv(values.csv)) {
          await createUser({ dbConnection, mailer, email: row.email, name: row.name, sendInvite });
        }
        break;
      }
      case 'delete': {
        if (!values.email) {
          throw new Error('delete requires --email');
        }
        const user = await findAdminUserByEmail({ dbConnection, email: values.email });
        if (!user) {
          throw new Error('User not found');
        }
        await deleteAdminUser({ dbConnection, id: user.id });
        console.log(`Deleted ${user.email}`);
        break;
      }
    }
  } finally {
    await dbConnection.destroy();
  }
}

async function createUser({
  dbConnection,
  mailer,
  email,
  name,
  password,
  sendInvite,
}: {
  dbConnection: Awaited<ReturnType<typeof createDbConnection>>;
  mailer: Mailer;
  email: string;
  name: string;
  password?: string;
  sendInvite: boolean;
}) {
  let user;
  try {
    user = await createAdminUser({ dbConnection, email, name, password });
  } catch (err) {
    if (err instanceof HttpError && err.statusCode === 409) {
      console.log(`Skipped ${email.toLowerCase()} (already exists)`);
      return;
    }
    throw err;
  }
  console.log(`Created ${user.email} (${user.id})`);

  if (password) {
    return;
  }

  const { token } = await createPasswordResetToken({ dbConnection, user });
  const url = buildPasswordSetupUrl(token);
  console.log(`  set-password link (valid 1 hour): ${url}`);

  if (sendInvite) {
    try {
      await mailer.sendPasswordSetup({ to: user.email, name: user.name, url, kind: 'invite' });
      console.log('  invite email sent');
    } catch (err) {
      console.error(`  invite email failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}

/** "email,name" per line; optional header and quotes */
function readCsv(path: string): { email: string; name: string }[] {
  const unquote = (value: string) =>
    value
      .trim()
      .replace(/^"(.*)"$/, '$1')
      .trim();
  const rows: { email: string; name: string }[] = [];

  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    if (!line.trim()) {
      continue;
    }
    const [rawEmail, ...rest] = line.split(',');
    const email = unquote(rawEmail ?? '');
    if (email.toLowerCase() === 'email') {
      continue;
    }
    const name = unquote(rest.join(',')) || email.split('@')[0];
    rows.push({ email, name });
  }

  return rows;
}
