import { Response } from 'light-my-request';
import sinon from 'sinon';
import { expect } from 'chai';
import { AppDeps, setupApp } from '../app';
import { getDbConnection } from '../db/db';
import { FastifyInstance } from 'fastify';

type TestApp = {
  request: () => ReturnType<FastifyInstance['inject']>;
  raw: () => FastifyInstance;
};

export async function setupTestApp({ dbConnection, bunnyStream }: Partial<AppDeps> = {}): Promise<TestApp> {
  const app = await setupApp({
    dbConnection: dbConnection || getDbConnection(),
    bunnyStream: bunnyStream || {
      getVideos: sinon.stub().resolves([]),
    },
  });

  return {
    request: () => app.inject(),
    raw: () => app,
  };
}
