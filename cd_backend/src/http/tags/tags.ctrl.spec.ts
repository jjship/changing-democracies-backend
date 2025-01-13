import { expect } from 'chai';
import { DataSource } from 'typeorm';
import { setupTestApp } from '../../spec/testApp';
import { getDbConnection } from '../../db/db';
import { LanguageEntity } from '../../db/entities/Language';
import { TagEntity } from '../../db/entities/Tag';
import { NameEntity } from '../../db/entities/Name';
import { testDb } from '../../spec/testDb';

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
});
