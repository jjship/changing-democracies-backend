import { expect } from 'chai';
import { setupTestApp, TEST_ADMIN_PASSWORD } from '../spec/testApp';
import { ENV } from '../env';
import { getDbConnection } from '../db/db';
import { AuthSessionEntity } from '../db/entities/AuthSession';
import { SESSION_COOKIE_NAME } from './sessionCookie';

const NEW_PASSWORD = 'a-brand-new-password-123';

function setCookieHeader(res: { headers: Record<string, unknown> }): string {
  const header = res.headers['set-cookie'];
  const value = Array.isArray(header) ? header.join('; ') : header;
  expect(value, 'set-cookie header').to.be.a('string');
  return value as string;
}

function cookieValue(setCookie: string): string {
  const match = setCookie.match(new RegExp(`${SESSION_COOKIE_NAME}=([^;]*)`));
  expect(match, 'session cookie').to.not.equal(null);
  return (match as RegExpMatchArray)[1];
}

describe('Auth: session authentication', () => {
  it('should grant access with a valid session token as Bearer header', async () => {
    const testApp = await setupTestApp();
    const token = await testApp.createAuthToken();

    const res = await testApp
      .request()
      .get('/narratives')
      .headers({ Authorization: `Bearer ${token}` })
      .end();

    expect(res.statusCode).to.equal(200);
  });

  it('should grant access with a valid session cookie', async () => {
    const testApp = await setupTestApp();
    const token = await testApp.createAuthToken();

    const res = await testApp
      .request()
      .get('/narratives')
      .cookies({ [SESSION_COOKIE_NAME]: token })
      .end();

    expect(res.statusCode).to.equal(200);
  });

  it('should return 401 for an expired session', async () => {
    const testApp = await setupTestApp();
    const token = await testApp.createAuthToken();
    await getDbConnection()
      .getRepository(AuthSessionEntity)
      .createQueryBuilder()
      .update()
      .set({ expiresAt: new Date(Date.now() - 1000) })
      .execute();

    const res = await testApp
      .request()
      .get('/narratives')
      .headers({ Authorization: `Bearer ${token}` })
      .end();

    expect(res.statusCode).to.equal(401);
  });

  it('should return 401 for an unknown token', async () => {
    const testApp = await setupTestApp();

    const res = await testApp.request().get('/narratives').headers({ Authorization: 'Bearer not-a-session' }).end();

    expect(res.statusCode).to.equal(401);
  });

  it('should return 401 when no credentials are sent', async () => {
    const testApp = await setupTestApp();

    const res = await testApp.request().get('/narratives').end();

    expect(res.statusCode).to.equal(401);
  });

  it('should reject cookie-authenticated state changes from a foreign Origin (CSRF)', async () => {
    const testApp = await setupTestApp();
    const token = await testApp.createAuthToken();

    const res = await testApp
      .request()
      .post('/persons')
      .cookies({ [SESSION_COOKIE_NAME]: token })
      .headers({ Origin: 'https://evil.example' })
      .body({})
      .end();

    expect(res.statusCode).to.equal(403);
  });

  it('should accept cookie-authenticated state changes from the CMS Origin', async () => {
    const testApp = await setupTestApp();
    const token = await testApp.createAuthToken();

    const res = await testApp
      .request()
      .post('/persons')
      .cookies({ [SESSION_COOKIE_NAME]: token })
      .headers({ Origin: new URL(ENV.CMS_URL).origin })
      .body({})
      .end();

    // authenticated; empty body fails validation
    expect(res.statusCode).to.equal(400);
  });

  it('should not apply the Origin check to Bearer-authenticated requests', async () => {
    const testApp = await setupTestApp();
    const token = await testApp.createAuthToken();

    const res = await testApp
      .request()
      .post('/persons')
      .headers({ Authorization: `Bearer ${token}`, Origin: 'https://evil.example' })
      .body({})
      .end();

    expect(res.statusCode).to.equal(400);
  });
});

describe('POST /auth/sign-in', () => {
  it('should set a session cookie and return the user for valid credentials', async () => {
    const testApp = await setupTestApp();
    const admin = await testApp.createTestAdmin();

    const res = await testApp
      .request()
      .post('/auth/sign-in')
      .body({ email: admin.email.toUpperCase(), password: TEST_ADMIN_PASSWORD })
      .end();

    expect(res.statusCode).to.equal(200);
    expect(res.json()).to.deep.equal({ user: { id: admin.id, email: admin.email, name: admin.name } });

    const setCookie = setCookieHeader(res);
    expect(setCookie).to.include('HttpOnly');
    expect(setCookie).to.include('SameSite=Lax');

    const session = await testApp
      .request()
      .get('/auth/session')
      .cookies({ [SESSION_COOKIE_NAME]: cookieValue(setCookie) })
      .end();
    expect(session.statusCode).to.equal(200);
    expect(session.json().user.email).to.equal(admin.email);
  });

  it('should return 401 with the same message for a wrong password and an unknown email', async () => {
    const testApp = await setupTestApp();
    const admin = await testApp.createTestAdmin();

    const wrongPassword = await testApp
      .request()
      .post('/auth/sign-in')
      .body({ email: admin.email, password: 'definitely-not-the-password' })
      .end();
    const unknownEmail = await testApp
      .request()
      .post('/auth/sign-in')
      .body({ email: 'nobody@example.com', password: TEST_ADMIN_PASSWORD })
      .end();

    expect(wrongPassword.statusCode).to.equal(401);
    expect(unknownEmail.statusCode).to.equal(401);
    expect(wrongPassword.json()).to.deep.equal(unknownEmail.json());
    expect(wrongPassword.headers['set-cookie']).to.equal(undefined);
  });

  it('should return 401 for an account whose invite is still pending', async () => {
    const testApp = await setupTestApp();
    await testApp.createTestAdmin({ email: 'pending@example.com', password: null });

    const res = await testApp
      .request()
      .post('/auth/sign-in')
      .body({ email: 'pending@example.com', password: TEST_ADMIN_PASSWORD })
      .end();

    expect(res.statusCode).to.equal(401);
  });

  it('should return 400 for a malformed body', async () => {
    const testApp = await setupTestApp();

    const res = await testApp.request().post('/auth/sign-in').body({ email: 'not-an-email', password: 'x' }).end();

    expect(res.statusCode).to.equal(400);
  });

  it('should rate limit repeated attempts from one address', async function () {
    this.timeout(20000);
    const testApp = await setupTestApp();
    const admin = await testApp.createTestAdmin();

    const statuses: number[] = [];
    for (let i = 0; i < 6; i++) {
      const res = await testApp
        .request()
        .post('/auth/sign-in')
        .body({ email: admin.email, password: 'wrong-password-attempt' })
        .end();
      statuses.push(res.statusCode);
    }

    expect(statuses.slice(0, 5)).to.deep.equal([401, 401, 401, 401, 401]);
    expect(statuses[5]).to.equal(429);
  });
});

describe('GET /auth/session and POST /auth/sign-out', () => {
  it('should return 401 without a session', async () => {
    const testApp = await setupTestApp();

    const res = await testApp.request().get('/auth/session').end();

    expect(res.statusCode).to.equal(401);
  });

  it('should revoke the session and clear the cookie on sign-out', async () => {
    const testApp = await setupTestApp();
    const token = await testApp.createAuthToken();

    const signOut = await testApp
      .request()
      .post('/auth/sign-out')
      .cookies({ [SESSION_COOKIE_NAME]: token })
      .end();

    expect(signOut.statusCode).to.equal(204);
    expect(setCookieHeader(signOut)).to.match(new RegExp(`${SESSION_COOKIE_NAME}=;`));

    const afterwards = await testApp
      .request()
      .get('/auth/session')
      .cookies({ [SESSION_COOKIE_NAME]: token })
      .end();
    expect(afterwards.statusCode).to.equal(401);
  });
});

describe('Password reset flow', () => {
  it('should email a reset link that sets a new password and revokes existing sessions', async () => {
    const testApp = await setupTestApp();
    const admin = await testApp.createTestAdmin();
    const existingSession = await testApp.createAuthToken();

    const request = await testApp.request().post('/auth/request-password-reset').body({ email: admin.email }).end();
    expect(request.statusCode).to.equal(200);
    expect(request.json()).to.deep.equal({ ok: true });

    expect(testApp.mailer.sendPasswordSetup).to.have.been.calledOnce;
    const [email] = testApp.mailer.sendPasswordSetup.firstCall.args as [{ to: string; url: string; kind: string }];
    expect(email.to).to.equal(admin.email);
    expect(email.kind).to.equal('reset');
    const resetUrl = new URL(email.url);
    expect(resetUrl.origin).to.equal(new URL(ENV.CMS_URL).origin);
    expect(resetUrl.pathname).to.equal('/reset-password');
    const token = resetUrl.searchParams.get('token');
    expect(token).to.be.a('string');

    const reset = await testApp.request().post('/auth/reset-password').body({ token, password: NEW_PASSWORD }).end();
    expect(reset.statusCode).to.equal(200);

    const oldSession = await testApp
      .request()
      .get('/auth/session')
      .headers({ Authorization: `Bearer ${existingSession}` })
      .end();
    expect(oldSession.statusCode).to.equal(401);

    const oldPassword = await testApp
      .request()
      .post('/auth/sign-in')
      .body({ email: admin.email, password: TEST_ADMIN_PASSWORD })
      .end();
    expect(oldPassword.statusCode).to.equal(401);

    const newPassword = await testApp
      .request()
      .post('/auth/sign-in')
      .body({ email: admin.email, password: NEW_PASSWORD })
      .end();
    expect(newPassword.statusCode).to.equal(200);

    const reuse = await testApp.request().post('/auth/reset-password').body({ token, password: NEW_PASSWORD }).end();
    expect(reuse.statusCode).to.equal(400);
  });

  it('should respond identically for an unknown email without sending anything', async () => {
    const testApp = await setupTestApp();

    const res = await testApp
      .request()
      .post('/auth/request-password-reset')
      .body({ email: 'nobody@example.com' })
      .end();

    expect(res.statusCode).to.equal(200);
    expect(res.json()).to.deep.equal({ ok: true });
    expect(testApp.mailer.sendPasswordSetup).to.not.have.been.called;
  });

  it('should reject an invalid token and a too-short password', async () => {
    const testApp = await setupTestApp();

    const badToken = await testApp
      .request()
      .post('/auth/reset-password')
      .body({ token: 'nope', password: NEW_PASSWORD })
      .end();
    const shortPassword = await testApp
      .request()
      .post('/auth/reset-password')
      .body({ token: 'nope', password: 'short' })
      .end();

    expect(badToken.statusCode).to.equal(400);
    expect(shortPassword.statusCode).to.equal(400);
  });
});

describe('Admin user management', () => {
  it('should list, invite and delete admins for a signed-in admin', async () => {
    const testApp = await setupTestApp();
    const admin = await testApp.createTestAdmin();
    const token = await testApp.createAuthToken();
    const auth = { Authorization: `Bearer ${token}` };

    const created = await testApp
      .request()
      .post('/auth/users')
      .headers(auth)
      .body({ email: 'New.Admin@Example.com', name: 'New Admin' })
      .end();
    expect(created.statusCode).to.equal(201);
    expect(created.json()).to.include({
      email: 'new.admin@example.com',
      name: 'New Admin',
      hasPassword: false,
      inviteSent: true,
    });
    expect(testApp.mailer.sendPasswordSetup).to.have.been.calledOnce;
    expect(testApp.mailer.sendPasswordSetup.firstCall.args[0]).to.include({
      to: 'new.admin@example.com',
      kind: 'invite',
    });

    const duplicate = await testApp
      .request()
      .post('/auth/users')
      .headers(auth)
      .body({ email: 'new.admin@example.com', name: 'Again' })
      .end();
    expect(duplicate.statusCode).to.equal(409);

    const list = await testApp.request().get('/auth/users').headers(auth).end();
    expect(list.statusCode).to.equal(200);
    expect(list.json().map((u: { email: string }) => u.email)).to.deep.equal([admin.email, 'new.admin@example.com']);

    const self = await testApp.request().delete(`/auth/users/${admin.id}`).headers(auth).end();
    expect(self.statusCode).to.equal(400);

    const other = await testApp.request().delete(`/auth/users/${created.json().id}`).headers(auth).end();
    expect(other.statusCode).to.equal(204);

    const missing = await testApp.request().delete(`/auth/users/${created.json().id}`).headers(auth).end();
    expect(missing.statusCode).to.equal(404);
  });

  it('should require a session', async () => {
    const testApp = await setupTestApp();

    const res = await testApp.request().get('/auth/users').end();

    expect(res.statusCode).to.equal(401);
  });
});

describe('Auth: API key authentication', () => {
  it('should grant access with a valid CLIENT_API_KEY', async () => {
    const testApp = await setupTestApp();

    const res = await testApp.request().get('/client-narratives').headers({ 'x-api-key': ENV.CLIENT_API_KEY }).end();

    expect(res.statusCode).to.equal(200);
  });

  it('should grant access to POST /sync-fragments with GITHUB_API_KEY', async () => {
    const testApp = await setupTestApp();

    const res = await testApp.request().post('/sync-fragments').headers({ 'x-api-key': ENV.GITHUB_API_KEY }).end();

    // 200 means permission granted (handler runs, may succeed or fail on domain logic)
    expect(res.statusCode).to.equal(200);
  });

  it('should return 401 for an invalid API key', async () => {
    const testApp = await setupTestApp();

    const res = await testApp.request().get('/client-narratives').headers({ 'x-api-key': 'invalid-key' }).end();

    expect(res.statusCode).to.equal(401);
  });

  it('should return 401 for a prototype-property header value', async () => {
    const testApp = await setupTestApp();

    const res = await testApp.request().get('/client-narratives').headers({ 'x-api-key': 'constructor' }).end();

    expect(res.statusCode).to.equal(401);
  });

  it('should return 401 when x-api-key header is missing', async () => {
    const testApp = await setupTestApp();

    const res = await testApp.request().get('/client-narratives').end();

    expect(res.statusCode).to.equal(401);
  });

  it('should return 403 when CLIENT_API_KEY tries to access POST /sync-fragments', async () => {
    const testApp = await setupTestApp();

    const res = await testApp.request().post('/sync-fragments').headers({ 'x-api-key': ENV.CLIENT_API_KEY }).end();

    expect(res.statusCode).to.equal(403);
  });
});
