import { expect } from 'chai';
import { DataSource } from 'typeorm';
import { setupTestApp } from '../../spec/testApp';
import { getDbConnection } from '../../db/db';
import { LanguageEntity } from '../../db/entities/Language';
import { TagEntity } from '../../db/entities/Tag';
import { NameEntity } from '../../db/entities/Name';
import { testDb } from '../../spec/testDb';
import { FragmentEntity } from '../../db/entities/Fragment';
import { v4 as uuidv4 } from 'uuid';
import { In } from 'typeorm';

describe('Tags Controller', () => {
  let dbConnection: DataSource;
  let testApp: Awaited<ReturnType<typeof setupTestApp>>;
  let authToken: string;

  beforeEach(async () => {
    testApp = await setupTestApp();
    dbConnection = getDbConnection();
    authToken = testApp.createAuthToken();

    await testDb.saveTestLanguages([
      { code: 'EN', name: 'English' },
      { code: 'ES', name: 'Spanish' },
    ]);
  });

  describe('POST /tags', () => {
    it('should create a new tag with names in multiple languages when authenticated', async () => {
      const response = await testApp
        .request()
        .post('/tags')
        .headers({ Authorization: `Bearer ${authToken}` })
        .body({
          names: [
            { languageCode: 'EN', name: 'Climate Change' },
            { languageCode: 'ES', name: 'Cambio Climático' },
          ],
        })
        .end();

      expect(response.statusCode).to.equal(201);
      const body = response.json();
      expect(body).to.have.property('id').that.is.a('string');
      expect(body.names).to.have.lengthOf(2);
      expect(body.names).to.deep.include({ languageCode: 'EN', name: 'Climate Change' });
      expect(body.names).to.deep.include({ languageCode: 'ES', name: 'Cambio Climático' });
      expect(body.fragments).to.be.an('array').that.is.empty;

      // Verify database state
      const tag = await dbConnection.getRepository(TagEntity).findOne({
        where: { id: body.id },
        relations: ['names', 'names.language'],
      });
      expect(tag).to.not.be.null;
      expect(tag!.names).to.have.lengthOf(2);
    });

    it('should return 401 when not authenticated', async () => {
      const response = await testApp
        .request()
        .post('/tags')
        .body({
          names: [{ languageCode: 'EN', name: 'Test Tag' }],
        })
        .end();

      expect(response.statusCode).to.equal(401);
    });

    it('should fail when language does not exist', async () => {
      const response = await testApp
        .request()
        .post('/tags')
        .headers({ Authorization: `Bearer ${authToken}` })
        .body({
          names: [{ languageCode: 'xx', name: 'Invalid Language' }],
        })
        .end();

      expect(response.statusCode).to.equal(500);
    });
  });

  describe('PUT /tags/:id', () => {
    let existingTagId: string;
    let fragmentIds: string[] = [];

    beforeEach(async () => {
      // Create a tag to update
      const tag = new TagEntity();
      const name = new NameEntity();
      name.language = await dbConnection.getRepository(LanguageEntity).findOneByOrFail({ code: 'EN' });
      name.name = 'Original Name';
      name.type = 'Tag';
      name.tag = tag;
      tag.names = [name];

      const savedTag = await dbConnection.getRepository(TagEntity).save(tag);
      existingTagId = savedTag.id;

      // Create test fragments
      fragmentIds = [];
      for (let i = 0; i < 2; i++) {
        const fragment = new FragmentEntity();
        fragment.id = uuidv4();
        fragment.title = `Test Fragment ${i}`;
        fragment.playerUrl = `https://example.com/player/${i}`;
        fragment.thumbnailUrl = `https://example.com/thumbnail/${i}`;
        await dbConnection.getRepository(FragmentEntity).save(fragment);
        fragmentIds.push(fragment.id);
      }
    });

    it('should update an existing tag when authenticated', async () => {
      const response = await testApp
        .request()
        .put(`/tags/${existingTagId}`)
        .headers({ Authorization: `Bearer ${authToken}` })
        .body({
          names: [
            { languageCode: 'EN', name: 'Updated Name' },
            { languageCode: 'ES', name: 'Nombre Actualizado' },
          ],
        })
        .end();

      expect(response.statusCode).to.equal(200);
      const body = response.json();
      expect(body.id).to.equal(existingTagId);
      expect(body.names).to.have.lengthOf(2);
      expect(body.names).to.deep.include({ languageCode: 'EN', name: 'Updated Name' });
      expect(body.names).to.deep.include({ languageCode: 'ES', name: 'Nombre Actualizado' });

      // Verify database state
      const tag = await dbConnection.getRepository(TagEntity).findOne({
        where: { id: existingTagId },
        relations: ['names', 'names.language'],
      });
      expect(tag!.names).to.have.lengthOf(2);
    });

    it('should return 401 when not authenticated', async () => {
      const response = await testApp
        .request()
        .put(`/tags/${existingTagId}`)
        .body({
          names: [{ languageCode: 'EN', name: 'Test' }],
        })
        .end();

      expect(response.statusCode).to.equal(401);
    });

    it('should return 404 for non-existent tag', async () => {
      const response = await testApp
        .request()
        .put('/tags/non-existent-id')
        .headers({ Authorization: `Bearer ${authToken}` })
        .body({
          names: [{ languageCode: 'EN', name: 'Test' }],
        })
        .end();

      expect(response.statusCode).to.equal(404);
    });

    it('should update a tag with fragment associations when authenticated', async () => {
      const response = await testApp
        .request()
        .put(`/tags/${existingTagId}`)
        .headers({ Authorization: `Bearer ${authToken}` })
        .body({
          names: [{ languageCode: 'EN', name: 'Updated Name' }],
          fragmentIds: fragmentIds,
        })
        .end();

      expect(response.statusCode).to.equal(200);
      const body = response.json();
      expect(body.id).to.equal(existingTagId);
      expect(body.fragments).to.be.an('array').that.has.lengthOf(2);
      expect(body.fragments.map((f: { id: string }) => f.id)).to.have.members(fragmentIds);
      expect(body.fragments[0]).to.have.property('title');
      expect(body.fragments[0]).to.have.property('thumbnailUrl');

      // Verify database state
      const tag = await dbConnection.getRepository(TagEntity).findOne({
        where: { id: existingTagId },
        relations: ['names', 'names.language', 'fragments'],
      });

      expect(tag!.fragments).to.have.lengthOf(2);
      const tagFragmentIds = tag!.fragments!.map((f) => f.id);
      expect(tagFragmentIds).to.have.members(fragmentIds);
    });
  });

  describe('DELETE /tags/:id', () => {
    let existingTagId: string;

    beforeEach(async () => {
      // Create a tag to delete
      const tag = new TagEntity();
      const name = new NameEntity();
      name.language = await dbConnection.getRepository(LanguageEntity).findOneByOrFail({ code: 'EN' });
      name.name = 'Tag to Delete';
      name.type = 'Tag';
      name.tag = tag;
      tag.names = [name];

      const savedTag = await dbConnection.getRepository(TagEntity).save(tag);
      existingTagId = savedTag.id;
    });

    it('should delete an existing tag when authenticated', async () => {
      const response = await testApp
        .request()
        .delete(`/tags/${existingTagId}`)
        .headers({ Authorization: `Bearer ${authToken}` })
        .end();

      expect(response.statusCode).to.equal(204);

      const tag = await dbConnection.getRepository(TagEntity).findOne({
        where: { id: existingTagId },
      });
      expect(tag).to.be.null;

      const names = await dbConnection.getRepository(NameEntity).find({
        where: { tag: { id: existingTagId } },
      });
      expect(names).to.be.empty;
    });

    it('should delete tag names but preserve fragments when deleting a tag', async () => {
      // Create fragments
      const fragmentIds: string[] = [];
      for (let i = 0; i < 2; i++) {
        const fragment = new FragmentEntity();
        fragment.id = uuidv4();
        fragment.title = `Test Fragment ${i}`;
        fragment.playerUrl = `https://example.com/player/${i}`;
        fragment.thumbnailUrl = `https://example.com/thumbnail/${i}`;
        await dbConnection.getRepository(FragmentEntity).save(fragment);
        fragmentIds.push(fragment.id);
      }

      // Associate fragments with tag
      const tagRepo = dbConnection.getRepository(TagEntity);
      const fragmentRepo = dbConnection.getRepository(FragmentEntity);

      const tag = await tagRepo.findOneOrFail({
        where: { id: existingTagId },
      });

      const fragments = await fragmentRepo.findBy({
        id: In(fragmentIds),
      });

      tag.fragments = fragments;
      await tagRepo.save(tag);

      // Verify fragments are associated before deletion
      const tagWithFragments = await tagRepo.findOne({
        where: { id: existingTagId },
        relations: ['fragments'],
      });

      expect(tagWithFragments?.fragments).to.have.lengthOf(2);

      // Delete the tag
      const response = await testApp
        .request()
        .delete(`/tags/${existingTagId}`)
        .headers({ Authorization: `Bearer ${authToken}` })
        .end();

      expect(response.statusCode).to.equal(204);

      // Verify tag is deleted
      const deletedTag = await tagRepo.findOne({
        where: { id: existingTagId },
      });
      expect(deletedTag).to.be.null;

      // Verify names are deleted
      const names = await dbConnection.getRepository(NameEntity).find({
        where: { tag: { id: existingTagId } },
      });
      expect(names).to.be.empty;

      // Verify fragments still exist
      const existingFragments = await fragmentRepo.findBy({
        id: In(fragmentIds),
      });
      expect(existingFragments).to.have.lengthOf(2);

      // Verify association is removed (by checking the join table)
      const fragmentTag = await dbConnection
        .createQueryBuilder()
        .select('*')
        .from('fragment_tags', 'ft')
        .where('ft.tag_id = :tagId', { tagId: existingTagId })
        .getRawMany();

      expect(fragmentTag).to.be.empty;
    });

    it('should return 401 when not authenticated', async () => {
      const response = await testApp.request().delete(`/tags/${existingTagId}`).end();

      expect(response.statusCode).to.equal(401);
    });

    it('should succeed even if tag does not exist', async () => {
      const response = await testApp
        .request()
        .delete('/tags/non-existent-id')
        .headers({ Authorization: `Bearer ${authToken}` })
        .end();

      expect(response.statusCode).to.equal(204);
    });
  });

  describe('GET /tags', () => {
    let tag1Id: string;
    let tag2Id: string;
    let fragmentIds: string[] = [];

    beforeEach(async () => {
      // Create test fragments
      fragmentIds = [];
      for (let i = 0; i < 2; i++) {
        const fragment = new FragmentEntity();
        fragment.id = uuidv4();
        fragment.title = `Test Fragment ${i}`;
        fragment.playerUrl = `https://example.com/player/${i}`;
        fragment.thumbnailUrl = `https://example.com/thumbnail/${i}`;
        await dbConnection.getRepository(FragmentEntity).save(fragment);
        fragmentIds.push(fragment.id);
      }

      // Create test tags
      const tag1 = new TagEntity();
      const name1 = new NameEntity();
      name1.language = await dbConnection.getRepository(LanguageEntity).findOneByOrFail({ code: 'EN' });
      name1.name = 'Tag 1';
      name1.type = 'Tag';
      name1.tag = tag1;
      tag1.names = [name1];

      const savedTag1 = await dbConnection.getRepository(TagEntity).save(tag1);
      tag1Id = savedTag1.id;

      // Associate fragments with tag1
      const fragmentRepo = dbConnection.getRepository(FragmentEntity);
      const fragments = await fragmentRepo.findBy({
        id: In(fragmentIds),
      });
      savedTag1.fragments = fragments;
      await dbConnection.getRepository(TagEntity).save(savedTag1);

      // Create a second tag without fragments
      const tag2 = new TagEntity();
      const name2 = new NameEntity();
      name2.language = await dbConnection.getRepository(LanguageEntity).findOneByOrFail({ code: 'EN' });
      name2.name = 'Tag 2';
      name2.type = 'Tag';
      name2.tag = tag2;
      tag2.names = [name2];

      const savedTag2 = await dbConnection.getRepository(TagEntity).save(tag2);
      tag2Id = savedTag2.id;
    });

    it('should return all tags with their fragments', async () => {
      const response = await testApp
        .request()
        .get('/tags')
        .headers({ Authorization: `Bearer ${authToken}` })
        .end();

      expect(response.statusCode).to.equal(200);
      const body = response.json();
      expect(body).to.be.an('array').with.length.of.at.least(2);

      const tag1 = body.find((t: { id: string }) => t.id === tag1Id);
      const tag2 = body.find((t: { id: string }) => t.id === tag2Id);

      expect(tag1).to.not.be.undefined;
      expect(tag1.fragments).to.be.an('array').with.lengthOf(2);
      expect(tag1.fragments.map((f: { id: string }) => f.id)).to.have.members(fragmentIds);

      expect(tag2).to.not.be.undefined;
      expect(tag2.fragments).to.be.an('array').that.is.empty;
    });
  });
});
