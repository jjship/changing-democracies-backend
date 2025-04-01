import uuid4 from 'uuid4';
import { setupTestApp } from '../../spec/testApp';
import { testDb } from '../../spec/testDb';
import { expect } from 'chai';
import { getDbConnection } from '../../db/db';
import { NarrativeEntity } from '../../db/entities/Narrative';
import { DataSource } from 'typeorm';

describe('POST /narratives', () => {
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
  it('should save the new narrative in db', async () => {
    const guid1 = uuid4();
    const guid2 = uuid4();
    const guid3 = uuid4();
    const testVideos = [
      { guid: guid1, title: 'First Title', length: 1 },
      { guid: guid2, title: 'Second Title', length: 2 },
      { guid: guid3, title: 'Third Title', length: 3 },
    ];

    await testDb.saveTestFragments(testVideos);

    const createNarrativePayload = {
      type: 'narrative',
      attributes: {
        names: [{ languageCode: 'en', name: 'New Narrative' }],
        descriptions: [
          {
            languageCode: 'en',
            description: ['New Narrative Description?', 'Second, line of the description!'],
          },
        ],
        fragmentsSequence: [
          {
            fragmentId: guid1,
            sequence: 1,
          },
          {
            fragmentId: guid2,
            sequence: 2,
          },
          {
            fragmentId: guid3,
            sequence: 3,
          },
        ],
      },
    };

    const res = await testApp
      .request()
      .post('/narratives')
      .headers({ Authorization: `Bearer ${authToken}` })
      .body({ data: createNarrativePayload })
      .end();
    const parsedRes = await res.json();

    const [newNarrative] = await dbConnection.getRepository(NarrativeEntity).find({
      relations: ['names', 'narrativeFragments', 'descriptions', 'descriptions.language'],
    });

    expect(newNarrative).to.not.be.null;
    expect(newNarrative!.names![0].name).to.equal(createNarrativePayload.attributes.names[0].name);
    expect(newNarrative!.descriptions).to.have.length(1);
    expect(newNarrative!.descriptions![0].language.code).to.equal(
      createNarrativePayload.attributes.descriptions[0].languageCode.toUpperCase()
    );
    expect(newNarrative!.descriptions![0].description).to.deep.equal(
      createNarrativePayload.attributes.descriptions[0].description
    );
    expect(newNarrative!.narrativeFragments).to.have.length(3);
    expect(newNarrative!.narrativeFragments![0].sequence).to.equal(1);
    expect(newNarrative!.narrativeFragments![1].sequence).to.equal(2);
    expect(newNarrative!.narrativeFragments![2].sequence).to.equal(3);

    expect(parsedRes.attributes).to.deep.equal({
      names: [{ languageCode: 'EN', name: 'New Narrative' }],
      totalDurationSec: 6,
      fragmentsSequence: [
        {
          fragmentId: guid1,
          sequence: 1,
        },
        {
          fragmentId: guid2,
          sequence: 2,
        },
        {
          fragmentId: guid3,
          sequence: 3,
        },
      ],
      descriptions: [
        {
          languageCode: 'EN',
          description: ['New Narrative Description?', 'Second, line of the description!'],
        },
      ],
    });
  });
});
