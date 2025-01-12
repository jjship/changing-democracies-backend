import { assert } from 'chai';
import { getLanguages } from './getLanguages';

suite('getLanguages', () => {
  test('extracts and deduplicates european languages', async () => {
    const countriesData = [
      {
        name: 'Belgium',
        languages: [
          {
            iso639_1: 'FR',
            name: 'French',
          },
          {
            iso639_1: 'NL',
            name: 'Dutch',
          },
        ],
      },
      {
        name: 'Poland',
        languages: [
          {
            iso639_1: 'PL',
            name: 'Polish',
          },
        ],
      },
      {
        name: 'France',
        languages: [
          {
            iso639_1: 'FR',
            name: 'French',
          },
        ],
      },
    ];

    const languagesData = getLanguages(countriesData as any);

    assert.equal(languagesData, [
      { name: 'French', code: 'FS' },
      { name: 'Dutch', code: 'NL' },
      { name: 'Polish', code: 'PL' },
    ]);
  });
});
