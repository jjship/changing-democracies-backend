import { Response } from 'light-my-request';
import sinon from 'sinon';
import { expect } from 'chai';
import { AppDeps, setupApp } from '../app';
import { getDbConnection } from '../db/db';
import { FastifyInstance } from 'fastify';

type TestApp = {
  request: () => ReturnType<FastifyInstance['inject']>;
  parseResponse: typeof parseResponse;
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
    parseResponse,
    raw: () => app,
  };
}

function parseResponse(res: Response) {
  try {
    expect(res.body.length).to.be.above(0);

    return JSON.parse(res.body);
  } catch (err: unknown) {
    if (err instanceof Error) {
      const req = `${res.raw.req.method} ${res.raw.req.url}`;
      throw new Error(`Can not parse request "${req}" response body: ${err.message}`);
    }

    throw err;
  }
}
