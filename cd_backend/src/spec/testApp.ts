import { Response } from 'light-my-request';
import sinon from 'sinon';
import { expect } from 'chai';
import { AppDeps, setupApp } from '../app';
import { getDbConnection } from '../db/db';
import { FastifyInstance } from 'fastify';
import { ENV } from '../env';
import jwt from 'jsonwebtoken';

type TestApp = {
  request: () => ReturnType<FastifyInstance['inject']>;
  raw: () => FastifyInstance;
  createAuthToken: (user?: Partial<TestUser>) => string;
};

interface TestUser {
  id: string;
  email: string;
  role: string;
}

const defaultTestUser: TestUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  role: 'authenticated',
};

export async function setupTestApp({ dbConnection, bunnyStream }: Partial<AppDeps> = {}): Promise<TestApp> {
  const app = await setupApp({
    dbConnection: dbConnection || getDbConnection(),
    bunnyStream: bunnyStream || {
      getVideos: sinon.stub().resolves([]),
      deleteVideoCaptions: sinon.stub().resolves(),
    },
  });

  function createAuthToken(user: Partial<TestUser> = {}) {
    const testUser = { ...defaultTestUser, ...user };
    return jwt.sign(
      {
        aud: 'authenticated',
        exp: Math.floor(Date.now() / 1000) + 60 * 60, // 1 hour from now
        sub: testUser.id,
        email: testUser.email,
        role: testUser.role,
      },
      ENV.SUPABASE_JWT_SECRET
    );
  }

  return {
    request: () => app.inject(),
    raw: () => app,
    createAuthToken,
  };
}
