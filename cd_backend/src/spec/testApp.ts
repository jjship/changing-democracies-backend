import sinon from 'sinon';
import { FastifyInstance } from 'fastify';
import { AppDeps, setupApp } from '../app';
import { getDbConnection } from '../db/db';
import { AdminUserEntity } from '../db/entities/AdminUser';
import { hashPassword } from '../auth/password';
import { createSession } from '../domain/auth/sessions';
import { Mailer } from '../services/mailer/mailer';

export const TEST_ADMIN_PASSWORD = 'correct-horse-battery-staple';

export type TestMailer = { sendPasswordSetup: sinon.SinonStub };

type TestApp = {
  request: () => ReturnType<FastifyInstance['inject']>;
  raw: () => FastifyInstance;
  /** Session token for a test admin; use as Bearer or cd_session cookie. */
  createAuthToken: (user?: Partial<TestUser>) => Promise<string>;
  createTestAdmin: (user?: Partial<TestUser>) => Promise<AdminUserEntity>;
  mailer: TestMailer;
};

export interface TestUser {
  email: string;
  name: string;
  /** null = invite pending */
  password: string | null;
}

const defaultTestUser: TestUser = {
  email: 'test@example.com',
  name: 'Test Admin',
  password: TEST_ADMIN_PASSWORD,
};

// hash the default password once (scrypt is slow)
let defaultPasswordHash: string | undefined;

export async function setupTestApp({
  dbConnection,
  bunnyStream,
  mailer,
}: Partial<Omit<AppDeps, 'mailer'>> & { mailer?: TestMailer } = {}): Promise<TestApp> {
  const db = dbConnection || getDbConnection();
  const testMailer: TestMailer = mailer ?? { sendPasswordSetup: sinon.stub().resolves() };

  const app = await setupApp({
    dbConnection: db,
    bunnyStream: bunnyStream || {
      getVideos: sinon.stub().resolves([]),
      deleteVideoCaptions: sinon.stub().resolves(),
      updateVideo: sinon.stub().resolves({}),
      uploadCaptions: sinon.stub().resolves(),
    },
    mailer: testMailer as unknown as Mailer,
  });

  async function createTestAdmin(user: Partial<TestUser> = {}) {
    const testUser = { ...defaultTestUser, ...user };
    const repository = db.getRepository(AdminUserEntity);

    const existing = await repository.findOneBy({ email: testUser.email });
    if (existing) {
      return existing;
    }

    let passwordHash: string | null = null;
    if (testUser.password === TEST_ADMIN_PASSWORD) {
      defaultPasswordHash ??= await hashPassword(TEST_ADMIN_PASSWORD);
      passwordHash = defaultPasswordHash;
    } else if (testUser.password !== null) {
      passwordHash = await hashPassword(testUser.password);
    }

    return repository.save(repository.create({ email: testUser.email, name: testUser.name, passwordHash }));
  }

  async function createAuthToken(user: Partial<TestUser> = {}) {
    const admin = await createTestAdmin(user);
    const { token } = await createSession({ dbConnection: db, user: admin });
    return token;
  }

  return {
    request: () => app.inject(),
    raw: () => app,
    createAuthToken,
    createTestAdmin,
    mailer: testMailer,
  };
}
