import uuid4 from 'uuid4';
import { setupTestApp } from '../../spec/testApp';
import { testDb } from '../../spec/testDb';
import { expect } from 'chai';
import { getDbConnection } from '../../db/db';
import { NarrativeEntity } from '../../db/entities/Narrative';

describe.only('DELETE /narratives/:id', () => {
  it('should delete the narrative and all related entities', async () => {
    // Setup test data
    await testDb.saveTestLanguages([{ name: 'English', code: 'EN' }]);
    const testApp = await setupTestApp();

    // Create test fragments
    const guid1 = uuid4();
    const guid2 = uuid4();
    await testDb.saveTestFragments([
      { guid: guid1, title: 'First Title', length: 1 },
      { guid: guid2, title: 'Second Title', length: 2 },
    ]);

    // Create a test narrative
    const narrative = new NarrativeEntity();
    const dbConnection = getDbConnection();
    await dbConnection.getRepository(NarrativeEntity).save(narrative);

    await dbConnection.transaction(async (entityManager) => {
      // Add descriptions
      narrative.descriptions = await testDb.createTestDescriptions([
        {
          languageCode: 'EN',
          description: ['Test Description'],
          narrative,
        },
      ]);

      // Add names
      narrative.names = await testDb.createTestNames([
        {
          languageCode: 'EN',
          name: 'Test Narrative',
          type: 'Narrative',
          narrative,
        },
      ]);

      // Add fragments
      narrative.narrativeFragments = await testDb.createTestNarrativeFragments([
        { fragmentId: guid1, sequence: 1, narrative },
        { fragmentId: guid2, sequence: 2, narrative },
      ]);

      narrative.totalDurationSec = 3;
      await entityManager.save(narrative);
    });

    // Verify narrative exists before deletion
    const narrativeBeforeDelete = await dbConnection.getRepository(NarrativeEntity).findOne({
      where: { id: narrative.id },
      relations: ['descriptions', 'names', 'narrativeFragments'],
    });
    expect(narrativeBeforeDelete).to.not.be.null;
    expect(narrativeBeforeDelete!.descriptions).to.have.length(1);
    expect(narrativeBeforeDelete!.names).to.have.length(1);
    expect(narrativeBeforeDelete!.narrativeFragments).to.have.length(2);

    // Perform delete request
    const res = await testApp.request().delete(`/narratives/${narrative.id}`).end();
    expect(res.statusCode).to.equal(204);

    // Verify narrative and related entities are deleted
    const narrativeAfterDelete = await dbConnection.getRepository(NarrativeEntity).findOne({
      where: { id: narrative.id },
      relations: ['descriptions', 'names', 'narrativeFragments'],
    });
    expect(narrativeAfterDelete).to.be.null;
  });

  it('should return 404 when narrative not found', async () => {
    const testApp = await setupTestApp();
    const nonExistentId = uuid4();

    const res = await testApp.request().delete(`/narratives/${nonExistentId}`).end();
    const parsedRes = await res.json();

    expect(res.statusCode).to.equal(404);
    expect(parsedRes).to.deep.equal({
      errors: [
        {
          status: '404',
          title: 'Narrative Not Found',
          detail: `Narrative with id '${nonExistentId}' not found`,
        },
      ],
    });
  });
});
