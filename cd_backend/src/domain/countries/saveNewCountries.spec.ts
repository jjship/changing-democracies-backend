import sinon from 'sinon';
import { getDbConnection } from '../../db/db';
import { CountryEntity } from '../../db/entities/Country';
import { testDb } from '../../spec/testDb';
import { saveNewCountries } from './saveNewCountries';
import pino from 'pino';
import { expect } from 'chai';

describe('saveNewCountries', () => {
  it('should add countries if not already in DB', async () => {
    const dbConnection = getDbConnection();
    await testDb.saveTestLanguages([
      { name: 'English', code: 'EN' },
      { name: 'French', code: 'FR' },
    ]);
    await testDb.saveTestCountries([
      { name: 'Poland', code: 'PL' },
      { name: 'Greece', code: 'GR' },
    ]);

    const countriesData = [
      {
        name: 'Poland',
        alpha2Code: 'PL',
        translations: {},
      },
      {
        name: 'Greece',
        alpha2Code: 'GR',
        translations: {},
      },
      {
        name: 'Spain',
        alpha2Code: 'ES',
      },
    ];

    await saveNewCountries({ dbConnection, logger: pino() })(countriesData as any);

    const countriesAfter = await dbConnection.getRepository(CountryEntity).find({
      relations: {
        names: true,
      },
    });

    expect(countriesAfter).to.have.length(3);
    expect(countriesAfter[2].code).to.equal('ES');
    expect(countriesAfter[2].names?.find((n) => n.name === 'Spain')).to.exist;
  });
});
