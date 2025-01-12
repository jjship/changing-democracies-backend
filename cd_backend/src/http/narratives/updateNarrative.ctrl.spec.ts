import { expect } from 'chai';
import { setupTestApp } from '../../spec/testApp';
import uuid4 from 'uuid4';
import { testDb } from '../../spec/testDb';

describe('PATCH /narratives/:id', async () => {
  it('should update narrative with new names and descriptions', async () => {
    const testApp = await setupTestApp();

    const guid1 = uuid4();
    const guid2 = uuid4();
    const guid3 = uuid4();
    await testDb.saveTestLanguages([
      { name: 'English', code: 'EN' },
      { name: 'Spanish', code: 'ES' },
    ]);

    const testVideos = [
      { guid: guid1, title: 'First Title', length: 1 },
      { guid: guid2, title: 'Second Title', length: 2 },
      { guid: guid3, title: 'Third Title', length: 3 },
    ];

    await testDb.saveTestFragments(testVideos);

    const resNarrative = await testApp
      .request()
      .post('/narratives')
      .body({
        data: {
          type: 'narrative',
          attributes: {
            names: [{ languageCode: 'EN', name: 'New Narrative' }],
            descriptions: [
              {
                languageCode: 'EN',
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
        },
      })
      .end();

    const {
      data: { id, attributes: narrativeAttributes },
    } = await resNarrative.json();

    const testData = {
      narrative: { id, ...narrativeAttributes },
    };

    const res = await testApp
      .request()
      .patch(`/narratives/${testData.narrative.id}`)
      .body({
        data: {
          type: 'narrative',
          attributes: {
            names: [
              { languageCode: 'EN', name: 'Updated Name' },
              { languageCode: 'ES', name: 'Nombre Actualizado' },
            ],
            descriptions: [
              {
                languageCode: 'EN',
                description: ['Updated description line 1', 'Updated description line 2'],
              },
              {
                languageCode: 'ES',
                description: ['Updated description line 1', 'Updated description line 2'],
              },
            ],
            fragmentsSequence: [
              { fragmentId: guid1, sequence: 1 },
              { fragmentId: guid2, sequence: 2 },
            ],
          },
        },
      });

    expect(res.statusCode).to.equal(200);
    const parsedRes = await res.json();

    const { createdAt, updatedAt, ...attributes } = parsedRes.data.attributes;

    expect(createdAt).to.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    expect(updatedAt).to.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    expect(attributes.names).to.deep.include({ languageCode: 'EN', name: 'Updated Name' });
    expect(attributes.names).to.deep.include({ languageCode: 'ES', name: 'Nombre Actualizado' });
    expect(attributes.descriptions[0]).to.deep.equal({
      languageCode: 'EN',
      description: ['Updated description line 1', 'Updated description line 2'],
    });
    expect(attributes.descriptions[1]).to.deep.equal({
      languageCode: 'ES',
      description: ['Updated description line 1', 'Updated description line 2'],
    });
  });

  it('should update narrative fragments sequence', async () => {
    const testApp = await setupTestApp();

    const guid1 = uuid4();
    const guid2 = uuid4();
    const guid3 = uuid4();
    await testDb.saveTestLanguages([
      { name: 'English', code: 'EN' },
      { name: 'Spanish', code: 'ES' },
    ]);

    const testVideos = [
      { guid: guid1, title: 'First Title', length: 1 },
      { guid: guid2, title: 'Second Title', length: 2 },
      { guid: guid3, title: 'Third Title', length: 3 },
    ];

    await testDb.saveTestFragments(testVideos);

    const resNarrative = await testApp
      .request()
      .post('/narratives')
      .body({
        data: {
          type: 'narrative',
          attributes: {
            names: [{ languageCode: 'EN', name: 'New Narrative' }],
            descriptions: [
              {
                languageCode: 'EN',
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
        },
      })
      .end();

    const {
      data: { id, attributes: narrativeAttributes },
    } = await resNarrative.json();

    const testData = {
      narrative: { id, ...narrativeAttributes },
      fragments: [
        { id: guid1, durationSec: 1 },
        { id: guid2, durationSec: 2 },
        { id: guid3, durationSec: 3 },
      ],
    };

    const res = await testApp
      .request()
      .patch(`/narratives/${testData.narrative.id}`)
      .body({
        data: {
          type: 'narrative',
          attributes: {
            fragmentsSequence: [
              { fragmentId: guid3, sequence: 1 },
              { fragmentId: guid1, sequence: 2 },
            ],
          },
        },
      })
      .end();

    expect(res.statusCode).to.equal(200);
    const parsedRes = await res.json();

    const { fragmentsSequence, totalDurationSec } = parsedRes.data.attributes;
    expect(fragmentsSequence).to.deep.equal([
      { fragmentId: guid3, sequence: 1 },
      { fragmentId: guid1, sequence: 2 },
    ]);
    expect(totalDurationSec).to.equal(testData.fragments[0].durationSec + testData.fragments[2].durationSec);
  });

  it('should return 404 when narrative not found', async () => {
    const testApp = await setupTestApp();
    const res = await testApp
      .request()
      .patch(`/narratives/${uuid4()}`)
      .body({
        data: {
          type: 'narrative',
          attributes: {
            names: [{ languageCode: 'EN', name: 'Updated Name' }],
          },
        },
      })
      .end();

    expect(res.statusCode).to.equal(404);
    const parsedRes = await res.json();
    expect(parsedRes.errors[0].title).to.equal('Narrative Not Found');
  });

  it('should return 404 when language not found', async () => {
    const testApp = await setupTestApp();

    const guid1 = uuid4();
    const guid2 = uuid4();
    const guid3 = uuid4();
    await testDb.saveTestLanguages([
      { name: 'English', code: 'EN' },
      { name: 'Spanish', code: 'ES' },
    ]);

    const testVideos = [
      { guid: guid1, title: 'First Title', length: 1 },
      { guid: guid2, title: 'Second Title', length: 2 },
      { guid: guid3, title: 'Third Title', length: 3 },
    ];

    await testDb.saveTestFragments(testVideos);

    const resNarrative = await testApp
      .request()
      .post('/narratives')
      .body({
        data: {
          type: 'narrative',
          attributes: {
            names: [{ languageCode: 'EN', name: 'New Narrative' }],
            descriptions: [
              {
                languageCode: 'EN',
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
        },
      })
      .end();

    const {
      data: { id },
    } = await resNarrative.json();

    const res = await testApp
      .request()
      .patch(`/narratives/${id}`)
      .body({
        data: {
          type: 'narrative',
          attributes: {
            names: [{ languageCode: 'XX', name: 'Invalid Language' }],
          },
        },
      })
      .end();

    expect(res.statusCode).to.equal(404);
    const parsedRes = await res.json();
    expect(parsedRes.errors[0].title).to.equal('Language Not Found');
  });

  it('should return 404 when fragment not found', async () => {
    const testApp = await setupTestApp();

    const guid1 = uuid4();
    const guid2 = uuid4();
    const guid3 = uuid4();
    await testDb.saveTestLanguages([
      { name: 'English', code: 'EN' },
      { name: 'Spanish', code: 'ES' },
    ]);

    const testVideos = [
      { guid: guid1, title: 'First Title', length: 1 },
      { guid: guid2, title: 'Second Title', length: 2 },
      { guid: guid3, title: 'Third Title', length: 3 },
    ];

    await testDb.saveTestFragments(testVideos);

    const resNarrative = await testApp
      .request()
      .post('/narratives')
      .body({
        data: {
          type: 'narrative',
          attributes: {
            names: [{ languageCode: 'EN', name: 'New Narrative' }],
            descriptions: [
              {
                languageCode: 'EN',
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
        },
      })
      .end();

    const {
      data: { id },
    } = await resNarrative.json();

    const res = await testApp
      .request()
      .patch(`/narratives/${id}`)
      .body({
        data: {
          type: 'narrative',
          attributes: {
            fragmentsSequence: [{ fragmentId: uuid4(), sequence: 1 }],
          },
        },
      })
      .end();

    expect(res.statusCode).to.equal(404);
    const parsedRes = await res.json();
    expect(parsedRes.errors[0].title).to.equal('Fragment Not Found');
  });
});
