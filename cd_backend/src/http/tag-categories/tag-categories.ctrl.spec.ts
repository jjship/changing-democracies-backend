import { expect } from 'chai';
import { DataSource } from 'typeorm';
import { setupTestApp } from '../../spec/testApp';
import { getDbConnection } from '../../db/db';
import { LanguageEntity } from '../../db/entities/Language';
import { TagCategoryEntity } from '../../db/entities/TagCategory';
import { TagEntity } from '../../db/entities/Tag';
import { NameEntity } from '../../db/entities/Name';
import { testDb } from '../../spec/testDb';
import { v4 as uuidv4 } from 'uuid';
import { In } from 'typeorm';
import uuid4 from 'uuid4';

describe('Tag Categories Controller', () => {
  let dbConnection: DataSource;

  beforeEach(async () => {
    dbConnection = getDbConnection();

    await testDb.saveTestLanguages([
      { code: 'EN', name: 'English' },
      { code: 'ES', name: 'Spanish' },
    ]);
  });

  describe('POST /tag-categories', () => {
    it('should create a new tag category with names in multiple languages when authenticated', async () => {
      const testApp = await setupTestApp();
      const authToken = testApp.createAuthToken();

      const response = await testApp
        .request()
        .post('/tag-categories')
        .headers({ Authorization: `Bearer ${authToken}` })
        .body({
          names: [
            { languageCode: 'EN', name: 'Topics' },
            { languageCode: 'ES', name: 'Temas' },
          ],
        })
        .end();

      expect(response.statusCode).to.equal(201);
      const body = response.json();
      expect(body).to.have.property('id').that.is.a('string');
      expect(body.names).to.have.lengthOf(2);
      expect(body.names).to.deep.include({ languageCode: 'EN', name: 'Topics' });
      expect(body.names).to.deep.include({ languageCode: 'ES', name: 'Temas' });
      expect(body.tags).to.be.an('array').that.is.empty;

      // Verify database state
      const category = await dbConnection.getRepository(TagCategoryEntity).findOne({
        where: { id: body.id },
        relations: ['names', 'names.language'],
      });
      expect(category).to.not.be.null;
      expect(category!.names).to.have.lengthOf(2);
    });

    it('should create a tag category with associated tags when tagIds are provided', async () => {
      const testApp = await setupTestApp();
      const authToken = testApp.createAuthToken();

      // Create test tags first
      const tagIds: string[] = [];
      for (let i = 0; i < 2; i++) {
        const tag = new TagEntity();
        const name = new NameEntity();
        name.language = await dbConnection.getRepository(LanguageEntity).findOneByOrFail({ code: 'EN' });
        name.name = `Test Tag ${i}`;
        name.type = 'Tag';
        name.tag = tag;
        tag.names = [name];
        const savedTag = await dbConnection.getRepository(TagEntity).save(tag);
        tagIds.push(savedTag.id);
      }

      const response = await testApp
        .request()
        .post('/tag-categories')
        .headers({ Authorization: `Bearer ${authToken}` })
        .body({
          names: [{ languageCode: 'EN', name: 'Topics' }],
          tagIds,
        })
        .end();

      expect(response.statusCode).to.equal(201);
      const body = response.json();
      expect(body.tags).to.have.lengthOf(2);
      expect(body.tags.map((t: { id: string }) => t.id)).to.have.members(tagIds);

      // Verify database state
      const category = await dbConnection.getRepository(TagCategoryEntity).findOne({
        where: { id: body.id },
        relations: ['tags'],
      });
      expect(category!.tags).to.have.lengthOf(2);
      expect(category!.tags!.map((t) => t.id)).to.have.members(tagIds);
    });

    it('should update an existing category when id is provided', async () => {
      const testApp = await setupTestApp();
      const authToken = testApp.createAuthToken();

      // Create a category to update
      const category = new TagCategoryEntity();
      const name = new NameEntity();
      name.language = await dbConnection.getRepository(LanguageEntity).findOneByOrFail({ code: 'EN' });
      name.name = 'Original Name';
      name.type = 'TagCategory';
      name.tagCategory = category;
      category.names = [name];

      const savedCategory = await dbConnection.getRepository(TagCategoryEntity).save(category);

      const response = await testApp
        .request()
        .post('/tag-categories')
        .headers({ Authorization: `Bearer ${authToken}` })
        .body({
          id: savedCategory.id,
          names: [
            { languageCode: 'EN', name: 'Updated Name' },
            { languageCode: 'ES', name: 'Nombre Actualizado' },
          ],
        })
        .end();

      expect(response.statusCode).to.equal(200);
      const body = response.json();
      expect(body.id).to.equal(savedCategory.id);
      expect(body.names).to.have.lengthOf(2);
      expect(body.names).to.deep.include({ languageCode: 'EN', name: 'Updated Name' });
      expect(body.names).to.deep.include({ languageCode: 'ES', name: 'Nombre Actualizado' });

      // Verify database state
      const updatedCategory = await dbConnection.getRepository(TagCategoryEntity).findOne({
        where: { id: savedCategory.id },
        relations: ['names', 'names.language'],
      });
      expect(updatedCategory!.names).to.have.lengthOf(2);
    });

    it('should update a category with tag associations when tagIds are provided', async () => {
      const testApp = await setupTestApp();
      const authToken = testApp.createAuthToken();

      // Create a category to update
      const category = new TagCategoryEntity();
      const name = new NameEntity();
      name.language = await dbConnection.getRepository(LanguageEntity).findOneByOrFail({ code: 'EN' });
      name.name = 'Original Name';
      name.type = 'TagCategory';
      name.tagCategory = category;
      category.names = [name];

      const savedCategory = await dbConnection.getRepository(TagCategoryEntity).save(category);

      // Create test tags
      const tagIds: string[] = [];
      for (let i = 0; i < 2; i++) {
        const tag = new TagEntity();
        const name = new NameEntity();
        name.language = await dbConnection.getRepository(LanguageEntity).findOneByOrFail({ code: 'EN' });
        name.name = `Test Tag ${i}`;
        name.type = 'Tag';
        name.tag = tag;
        tag.names = [name];
        const savedTag = await dbConnection.getRepository(TagEntity).save(tag);
        tagIds.push(savedTag.id);
      }

      const response = await testApp
        .request()
        .post('/tag-categories')
        .headers({ Authorization: `Bearer ${authToken}` })
        .body({
          id: savedCategory.id,
          names: [{ languageCode: 'EN', name: 'Updated Name' }],
          tagIds,
        })
        .end();

      expect(response.statusCode).to.equal(200);
      const body = response.json();
      expect(body.id).to.equal(savedCategory.id);
      expect(body.tags).to.have.lengthOf(2);
      expect(body.tags.map((t: { id: string }) => t.id)).to.have.members(tagIds);

      // Verify database state
      const updatedCategory = await dbConnection.getRepository(TagCategoryEntity).findOne({
        where: { id: savedCategory.id },
        relations: ['tags'],
      });
      expect(updatedCategory!.tags).to.have.lengthOf(2);
      expect(updatedCategory!.tags!.map((t) => t.id)).to.have.members(tagIds);
    });

    it('should return 401 when not authenticated', async () => {
      const testApp = await setupTestApp();

      const response = await testApp
        .request()
        .post('/tag-categories')
        .body({
          names: [{ languageCode: 'EN', name: 'Test Category' }],
        })
        .end();

      expect(response.statusCode).to.equal(401);
    });

    it('should fail when language does not exist', async () => {
      const testApp = await setupTestApp();
      const authToken = testApp.createAuthToken();

      const response = await testApp
        .request()
        .post('/tag-categories')
        .headers({ Authorization: `Bearer ${authToken}` })
        .body({
          names: [{ languageCode: 'xx', name: 'Invalid Language' }],
        })
        .end();

      expect(response.statusCode).to.equal(500);
    });

    it('should return 404 when updating non-existent category', async () => {
      const testApp = await setupTestApp();
      const authToken = testApp.createAuthToken();
      const nonExistentCategoryId = uuid4();
      const response = await testApp
        .request()
        .post('/tag-categories')
        .headers({ Authorization: `Bearer ${authToken}` })
        .body({
          id: nonExistentCategoryId,
          names: [{ languageCode: 'EN', name: 'Test' }],
        })
        .end();

      expect(response.statusCode).to.equal(404);
    });
  });

  describe('DELETE /tag-categories/:id', () => {
    let existingCategoryId: string;

    beforeEach(async () => {
      // Create a category to delete
      const category = new TagCategoryEntity();
      const name = new NameEntity();
      name.language = await dbConnection.getRepository(LanguageEntity).findOneByOrFail({ code: 'EN' });
      name.name = 'Category to Delete';
      name.type = 'TagCategory';
      name.tagCategory = category;
      category.names = [name];

      const savedCategory = await dbConnection.getRepository(TagCategoryEntity).save(category);
      existingCategoryId = savedCategory.id;
    });

    it('should delete an existing category when authenticated', async () => {
      const testApp = await setupTestApp();
      const authToken = testApp.createAuthToken();

      const response = await testApp
        .request()
        .delete(`/tag-categories/${existingCategoryId}`)
        .headers({ Authorization: `Bearer ${authToken}` })
        .end();

      expect(response.statusCode).to.equal(204);

      const category = await dbConnection.getRepository(TagCategoryEntity).findOne({
        where: { id: existingCategoryId },
      });
      expect(category).to.be.null;

      const names = await dbConnection.getRepository(NameEntity).find({
        where: { tagCategory: { id: existingCategoryId } },
      });
      expect(names).to.be.empty;
    });

    it('should delete category names but preserve tags when deleting a category', async () => {
      const testApp = await setupTestApp();
      const authToken = testApp.createAuthToken();

      // Create tags
      const tagIds: string[] = [];
      for (let i = 0; i < 2; i++) {
        const tag = new TagEntity();
        const name = new NameEntity();
        name.language = await dbConnection.getRepository(LanguageEntity).findOneByOrFail({ code: 'EN' });
        name.name = `Test Tag ${i}`;
        name.type = 'Tag';
        name.tag = tag;
        tag.names = [name];
        const savedTag = await dbConnection.getRepository(TagEntity).save(tag);
        tagIds.push(savedTag.id);
      }

      // Associate tags with category
      const categoryRepo = dbConnection.getRepository(TagCategoryEntity);
      const tagRepo = dbConnection.getRepository(TagEntity);

      const category = await categoryRepo.findOneOrFail({
        where: { id: existingCategoryId },
      });

      const tags = await tagRepo.findBy({
        id: In(tagIds),
      });

      category.tags = tags;
      await categoryRepo.save(category);

      // Verify tags are associated before deletion
      const categoryWithTags = await categoryRepo.findOne({
        where: { id: existingCategoryId },
        relations: ['tags'],
      });

      expect(categoryWithTags?.tags).to.have.lengthOf(2);

      // Delete the category
      const response = await testApp
        .request()
        .delete(`/tag-categories/${existingCategoryId}`)
        .headers({ Authorization: `Bearer ${authToken}` })
        .end();

      expect(response.statusCode).to.equal(204);

      // Verify category is deleted
      const deletedCategory = await categoryRepo.findOne({
        where: { id: existingCategoryId },
      });
      expect(deletedCategory).to.be.null;

      // Verify names are deleted
      const names = await dbConnection.getRepository(NameEntity).find({
        where: { tagCategory: { id: existingCategoryId } },
      });
      expect(names).to.be.empty;

      // Verify tags still exist
      const existingTags = await tagRepo.findBy({
        id: In(tagIds),
      });
      expect(existingTags).to.have.lengthOf(2);

      // Verify association is removed (by checking the join table)
      const categoryTag = await dbConnection
        .createQueryBuilder()
        .select('*')
        .from('tag_category_tags', 'tct')
        .where('tct.tag_category_id = :categoryId', { categoryId: existingCategoryId })
        .getRawMany();

      expect(categoryTag).to.be.empty;
    });

    it('should return 401 when not authenticated', async () => {
      const testApp = await setupTestApp();
      const response = await testApp.request().delete(`/tag-categories/${existingCategoryId}`).end();

      expect(response.statusCode).to.equal(401);
    });

    it('should succeed even if category does not exist', async () => {
      const testApp = await setupTestApp();
      const authToken = testApp.createAuthToken();
      const nonExistentCategoryId = uuid4();

      const response = await testApp
        .request()
        .delete(`/tag-categories/${nonExistentCategoryId}`)
        .headers({ Authorization: `Bearer ${authToken}` })
        .end();

      expect(response.statusCode).to.equal(204);
    });
  });

  describe('GET /tag-categories', () => {
    let category1Id: string;
    let category2Id: string;
    let tagIds: string[] = [];

    beforeEach(async () => {
      // Create test tags
      tagIds = [];
      for (let i = 0; i < 2; i++) {
        const tag = new TagEntity();
        const name = new NameEntity();
        name.language = await dbConnection.getRepository(LanguageEntity).findOneByOrFail({ code: 'EN' });
        name.name = `Test Tag ${i}`;
        name.type = 'Tag';
        name.tag = tag;
        tag.names = [name];
        const savedTag = await dbConnection.getRepository(TagEntity).save(tag);
        tagIds.push(savedTag.id);
      }

      // Create test categories using the new helper method
      const categories = await testDb.saveTestTagCategories([
        {
          names: [{ languageCode: 'EN', name: 'Category 1' }],
          tagIds,
        },
        {
          names: [{ languageCode: 'EN', name: 'Category 2' }],
        },
      ]);

      category1Id = categories[0].id;
      category2Id = categories[1].id;
    });

    it('should return all categories with their tags', async () => {
      const testApp = await setupTestApp();
      const authToken = testApp.createAuthToken();

      const response = await testApp
        .request()
        .get('/tag-categories')
        .headers({ Authorization: `Bearer ${authToken}` })
        .end();

      expect(response.statusCode).to.equal(200);
      const body = response.json();
      expect(body).to.be.an('array').with.length.of.at.least(2);

      const category1 = body.find((c: { id: string }) => c.id === category1Id);
      const category2 = body.find((c: { id: string }) => c.id === category2Id);

      expect(category1).to.not.be.undefined;
      expect(category1.tags).to.be.an('array').with.lengthOf(2);
      expect(category1.tags.map((t: { id: string }) => t.id)).to.have.members(tagIds);

      expect(category2).to.not.be.undefined;
      expect(category2.tags).to.be.an('array').that.is.empty;
    });
  });
});
