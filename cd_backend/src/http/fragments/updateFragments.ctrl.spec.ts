import uuid4 from 'uuid4';
import { setupTestApp } from '../../spec/testApp';
import { testDb } from '../../spec/testDb';
import { expect } from 'chai';
import { getDbConnection } from '../../db/db';
import { FragmentEntity } from '../../db/entities/Fragment';
import { DataSource, In } from 'typeorm';

describe('PATCH /fragments', () => {
  let dbConnection: DataSource;
  let testApp: Awaited<ReturnType<typeof setupTestApp>>;
  let authToken: string;

  beforeEach(async () => {
    testApp = await setupTestApp();
    dbConnection = getDbConnection();
    authToken = testApp.createAuthToken();

    await testDb.saveTestLanguages([
      { code: 'en', name: 'English' },
      { code: 'es', name: 'Spanish' },
    ]);
  });
  it('should update multiple fragments', async () => {
    // Create test data
    const personId = uuid4();
    await testDb.saveTestPersons([{ name: 'Test Person', id: personId }]);

    // Create test tags first
    await testDb.saveTestTags([{ name: 'Tag 1' }, { name: 'Tag 2' }]);
    const dbConnection = getDbConnection();
    const tags = await dbConnection.getRepository('TagEntity').find();
    const [tag1, tag2] = tags;

    const guid1 = uuid4();
    const guid2 = uuid4();
    await testDb.saveTestFragments([
      { guid: guid1, title: 'Original Title 1', length: 1 },
      { guid: guid2, title: 'Original Title 2', length: 2 },
    ]);

    const updatePayload = {
      data: [
        {
          id: guid1,
          title: 'Updated Title 1',
          personId,
          tagIds: [tag1.id],
        },
        {
          id: guid2,
          title: 'Updated Title 2',
          tagIds: [tag1.id, tag2.id],
        },
      ],
    };

    const res = await testApp
      .request()
      .patch('/fragments')
      .headers({ Authorization: `Bearer ${authToken}` })
      .body(updatePayload)
      .end();
    expect(res.statusCode).to.equal(200);

    const fragments = await dbConnection.getRepository(FragmentEntity).find({
      where: { id: In([guid1, guid2]) },
      relations: ['person', 'tags'],
    });

    expect(fragments).to.have.length(2);
    const fragment1 = fragments.find((f) => f.id === guid1);
    const fragment2 = fragments.find((f) => f.id === guid2);

    expect(fragment1?.title).to.equal('Updated Title 1');
    expect(fragment1?.person?.id).to.equal(personId);
    expect(fragment1?.tags?.length).to.equal(1);
    expect(fragment1?.tags?.[0].id).to.equal(tag1.id);

    expect(fragment2?.title).to.equal('Updated Title 2');
    expect(fragment2?.person).to.be.null;
    expect(fragment2?.tags?.length).to.equal(2);
    expect(fragment2?.tags?.map((t) => t.id).sort()).to.deep.equal([tag1.id, tag2.id].sort());
  });

  it('should return 404 when fragment not found', async () => {
    const nonExistentId = uuid4();

    const updatePayload = {
      data: [
        {
          id: nonExistentId,
          title: 'New Title',
        },
      ],
    };

    const res = await testApp
      .request()
      .patch('/fragments')
      .headers({ Authorization: `Bearer ${authToken}` })
      .body(updatePayload)
      .end();
    const parsedRes = await res.json();

    expect(res.statusCode).to.equal(404);
    expect(parsedRes).to.deep.equal({
      errors: [
        {
          status: '404',
          title: 'Fragment Not Found',
          detail: `Fragment with id '${nonExistentId}' not found`,
        },
      ],
    });
  });

  it('should return 404 when person not found', async () => {
    const fragmentId = uuid4();
    const nonExistentPersonId = uuid4();

    await testDb.saveTestFragments([{ guid: fragmentId, title: 'Test Fragment', length: 1 }]);

    const updatePayload = {
      data: [
        {
          id: fragmentId,
          personId: nonExistentPersonId,
        },
      ],
    };

    const res = await testApp
      .request()
      .patch('/fragments')
      .headers({ Authorization: `Bearer ${authToken}` })
      .body(updatePayload)
      .end();
    const parsedRes = await res.json();

    expect(res.statusCode).to.equal(404);
    expect(parsedRes).to.deep.equal({
      errors: [
        {
          status: '404',
          title: 'Person Not Found',
          detail: `Person with id '${nonExistentPersonId}' not found`,
        },
      ],
    });
  });

  it('should return 404 when tag not found', async () => {
    const fragmentId = uuid4();
    const nonExistentTagId = uuid4();

    await testDb.saveTestFragments([{ guid: fragmentId, title: 'Test Fragment', length: 1 }]);

    const updatePayload = {
      data: [
        {
          id: fragmentId,
          tagIds: [nonExistentTagId],
        },
      ],
    };

    const res = await testApp
      .request()
      .patch('/fragments')
      .headers({ Authorization: `Bearer ${authToken}` })
      .body(updatePayload)
      .end();
    const parsedRes = await res.json();

    expect(res.statusCode).to.equal(404);
    expect(parsedRes).to.deep.equal({
      errors: [
        {
          status: '404',
          title: 'Tag Not Found',
          detail: `Tag with id '${nonExistentTagId}' not found`,
        },
      ],
    });
  });
});
