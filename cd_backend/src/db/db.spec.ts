import { expect } from 'chai';
import { getDbConnection } from './db';
import { FragmentEntity } from './entities/Fragment';
import uuid from 'uuid4';
import { PersonEntity } from './entities/Person';
import { CountryEntity } from './entities/Country';
import { LanguageEntity } from './entities/Language';

describe('Database', function () {
  // Increase timeout for this specific test
  this.timeout(5000);

  it('should insert and retrieve a simple entity', async () => {
    const connection = getDbConnection();

    // Create simple test entity - just a language
    const testCode = `TST-${Date.now()}`;
    const testName = `Test Language ${Date.now()}`;

    const languageRepo = connection.getRepository(LanguageEntity);

    // Create and save language
    const language = new LanguageEntity();
    language.code = testCode;
    language.name = testName;

    await languageRepo.save(language);

    // Retrieve and validate
    const savedLanguage = await languageRepo.findOneBy({ code: testCode });

    expect(savedLanguage).to.not.be.null;
    expect(savedLanguage?.name).to.equal(testName);
    expect(savedLanguage?.code).to.equal(testCode);
  });

  it('should insert and retrieve related entities', async () => {
    const connection = getDbConnection();

    // Create country and person with a simple relationship
    const countryRepo = connection.getRepository(CountryEntity);
    const personRepo = connection.getRepository(PersonEntity);

    const countryCode = `C${Date.now().toString().slice(-4)}`;

    // Create country
    const country = new CountryEntity();
    country.code = countryCode;
    await countryRepo.save(country);

    // Create person with country relationship
    const person = new PersonEntity();
    person.name = `Test Person ${Date.now()}`;
    person.normalizedName = `test-person-${Date.now()}`;
    person.country = country;

    await personRepo.save(person);

    // Retrieve with relationship and validate
    const savedPerson = await personRepo.findOne({
      where: { id: person.id },
      relations: ['country'],
    });

    expect(savedPerson).to.not.be.null;
    expect(savedPerson?.country).to.not.be.undefined;
    if (savedPerson && savedPerson.country) {
      expect(savedPerson.country.code).to.equal(countryCode);
    } else {
      throw new Error('Person or country relationship not found');
    }
  });
});
