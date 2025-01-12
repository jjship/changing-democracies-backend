import { expect } from 'chai';
import pino from 'pino';
import { getDbConnection } from '../../db/db';
import { LanguageEntity } from '../../db/entities/Language';
import { testDb } from '../../spec/testDb';
import { saveNewLanguages } from './saveNewLanguages';

describe('saveNewLanguages', () => {
  it('should add languages if not already in DB', async () => {
    const dbConnection = getDbConnection();

    await testDb.saveTestLanguages([
      { name: 'Polish', code: 'PL' },
      { name: 'Greek', code: 'GR' },
    ]);

    const countriesData = [
      {
        name: 'Poland',
        alpha2Code: 'PL',
        languages: [
          { name: 'Polish', iso639_1: 'PL' },
          { name: 'Slaski', iso639_1: 'SL' },
        ],
      },
      { name: 'Greece', alpha2Code: 'GR', languages: [{ name: 'Greek', iso639_1: 'GR' }] },
      {
        name: 'Spain',
        alpha2Code: 'ES',
        languages: [
          { name: 'Spanish', iso639_1: 'ES' },
          { name: 'Catalan', iso639_1: 'CT' },
        ],
      },
    ];

    await saveNewLanguages({ dbConnection, logger: pino() })(countriesData as any);

    const languagesAfter = await dbConnection.getRepository(LanguageEntity).find();

    expect(languagesAfter).to.have.length(5);
    expect(languagesAfter[2].code).to.equal('SL');
    expect(languagesAfter[3].code).to.equal('ES');
    expect(languagesAfter[4].code).to.equal('CT');
  });
});
