import { expect } from 'chai';
import { createDbConnection, getDbConnection } from './db';
import { FragmentEntity } from './entities/Fragment';
import { ENV } from '../env';
import { DataSource } from 'typeorm';
import uuid from 'uuid4';
import { PersonEntity } from './entities/Person';
import { CountryEntity } from './entities/Country';
import { BioEntity } from './entities/Bio';
import { TagEntity } from './entities/Tag';
import { NarrativeEntity } from './entities/Narrative';
import { NarrativeFragmentEntity } from './entities/NarrativeFragment';
import { DescriptionEntity } from './entities/Description';
import { LanguageEntity } from './entities/Language';
import { testDb } from '../spec/testDb';

describe('Database', () => {
  it('should insert and retrieve test data', async () => {
    const testFragmentId = uuid();
    let testTag: TagEntity | undefined;
    let testNarrativeFragment: NarrativeFragmentEntity | undefined;
    let testDescription: DescriptionEntity | undefined;
    let testLanguage: LanguageEntity | undefined;

    const connection = getDbConnection();

    await connection.transaction(async (entityManager) => {
      testLanguage = new LanguageEntity();
      testLanguage.code = 'TL';
      testLanguage.name = 'TestLanguage';
      await entityManager.save(LanguageEntity, testLanguage);

      await testDb.saveTestNames([
        { name: 'testCountry', type: 'Country', languageCode: 'TL' },
        { name: 'test_tag', type: 'Tag', languageCode: 'TL' },
        { name: 'Test Narrative', type: 'Narrative', languageCode: 'TL' },
      ]);

      const testCountry = new CountryEntity();
      testCountry.code = 'TC';
      await entityManager.save(CountryEntity, testCountry);

      const testBio = new BioEntity();
      testBio.bio = 'lorem ipsum i tak dalej';
      testBio.language = testLanguage;
      await entityManager.save(BioEntity, testBio);

      testTag = new TagEntity();
      await entityManager.save(TagEntity, testTag);

      const testPerson = new PersonEntity();
      testPerson.bios = [testBio];
      testPerson.country = testCountry;
      testPerson.name = 'testName testSurname';
      await entityManager.save(PersonEntity, testPerson);

      const testFragment = new FragmentEntity();
      testFragment.title = 'Test Fragment';
      testFragment.id = testFragmentId;
      testFragment.durationSec = 120;
      testFragment.playerUrl = 'http://example.com/player';
      testFragment.thumbnailUrl = 'http://example.com/thumbnail';
      testFragment.person = testPerson;
      testFragment.tags = [testTag];
      await entityManager.save(FragmentEntity, testFragment);

      testDescription = new DescriptionEntity();
      testDescription.description = ['English description', 'second line, of the description'];
      testDescription.language = testLanguage;
      await entityManager.save(DescriptionEntity, testDescription);

      const testNarrative = new NarrativeEntity();
      testNarrative.descriptions = [testDescription];
      await entityManager.save(NarrativeEntity, testNarrative);

      testNarrativeFragment = new NarrativeFragmentEntity();

      testNarrativeFragment.narrative = testNarrative;
      testNarrativeFragment.fragment = testFragment;
      testNarrativeFragment.sequence = 0;
      await entityManager.save(NarrativeFragmentEntity, testNarrativeFragment);
    });

    const fragmentRepository = connection.getRepository(FragmentEntity);

    const dbFragment = await fragmentRepository.findOne({
      where: { id: testFragmentId },
      relations: [
        'person',
        'person.country',
        'person.bios',
        'person.bios.language',
        'tags',
        'narrativeFragments',
        'narrativeFragments.fragment',
        'narrativeFragments.narrative',
        'narrativeFragments.narrative.descriptions',
      ],
    });

    expect(dbFragment!.person!.bios![0].language.id).to.equal(testLanguage!.id);
    expect(dbFragment!.tags).to.deep.equal([testTag]);
    expect(dbFragment?.narrativeFragments![0].id).to.equal(testNarrativeFragment!.id);
    expect(dbFragment?.narrativeFragments![0].id).to.equal(testNarrativeFragment!.id);
    expect(dbFragment?.narrativeFragments![0].narrative.descriptions![0].id).to.equal(testDescription!.id);
  });
});
