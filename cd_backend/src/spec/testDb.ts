import { getDbConnection } from '../db/db';
import { CountryEntity } from '../db/entities/Country';
import { FragmentEntity } from '../db/entities/Fragment';
import { NarrativeEntity } from '../db/entities/Narrative';
import { PersonEntity } from '../db/entities/Person';
import { BunnyVideo } from '../services/bunnyStream/bunnyStreamApiClient';
import { parseVideoToFragment } from '../domain/fragments/utils';
import { BioEntity } from '../db/entities/Bio';
import { TagEntity } from '../db/entities/Tag';

export const testDb = {
  async saveTestCountries(countries: Pick<CountryEntity, 'name'>[]) {
    await getDbConnection().transaction(async (entityManager) => {
      for (const country of countries) {
        const testCountry = new CountryEntity();
        testCountry.name = country.name;
        await entityManager.save(CountryEntity, testCountry);
      }
    });
  },

  async saveTestTags(tags: Pick<TagEntity, 'name'>[]) {
    await getDbConnection().transaction(async (entityManager) => {
      for (const tag of tags) {
        const testTag = new TagEntity();
        testTag.name = tag.name;
        await entityManager.save(TagEntity, testTag);
      }
    });
  },

  async saveTestBios(bios: Pick<BioEntity, 'bio' | 'language_code'>[]) {
    await getDbConnection().transaction(async (entityManager) => {
      for (const bio of bios) {
        const testBio = new BioEntity();
        testBio.bio = bio.bio;
        testBio.language_code = bio.language_code;
        await entityManager.save(BioEntity, testBio);
      }
    });
  },

  async saveTestPersons(persons: Pick<PersonEntity, 'name'>[]) {
    await getDbConnection().transaction(async (entityManager) => {
      for (const person of persons) {
        const testPerson = new PersonEntity();
        testPerson.name = person.name;
        await entityManager.save(PersonEntity, testPerson);
      }
    });
  },

  async saveTestFragments(videos: Pick<BunnyVideo, 'guid' | 'title' | 'length'>[]) {
    await getDbConnection().transaction(async (entityManager) => {
      for (const video of videos) {
        const testFragment = parseVideoToFragment(video as any);
        await entityManager.save(FragmentEntity, testFragment);
      }
    });
  },

  async saveTestNarratives(narratives: Pick<NarrativeEntity, 'title' | 'description'>[]) {
    await getDbConnection().transaction(async (entityManager) => {
      for (const narrative of narratives) {
        const testNarrative = new NarrativeEntity();
        testNarrative.title = narrative.title;
        testNarrative.description = narrative.description;
        await entityManager.save(NarrativeEntity, testNarrative);
      }
    });
  },
};
