import { getDbConnection } from '../db/db';
import { CountryEntity } from '../db/entities/Country';
import { FragmentEntity } from '../db/entities/Fragment';
import { NarrativeEntity } from '../db/entities/Narrative';
import { PersonEntity } from '../db/entities/Person';
import { BunnyVideo } from '../services/bunnyStream/bunnyStreamApiClient';
import { BioEntity } from '../db/entities/Bio';
import { TagEntity } from '../db/entities/Tag';
import { parseVideoToFragment } from '../domain/fragments/fragments.api';
import { DescriptionEntity } from '../db/entities/Description';
import { LanguageEntity } from '../db/entities/Language';
import { NameEntity } from '../db/entities/Name';
import { NarrativeFragmentEntity } from '../db/entities/NarrativeFragment';

export const testDb = {
  async saveTestCountries(countries: { name: string; code: string }[]) {
    await getDbConnection().transaction(async (entityManager) => {
      for (const country of countries) {
        const testCountry = new CountryEntity();
        testCountry.names = [entityManager.getRepository(NameEntity).create({ name: country.name, type: 'Country' })];
        testCountry.code = country.code;
        await entityManager.save(CountryEntity, testCountry);
      }
    });
  },

  async saveTestLanguages(languages: Pick<LanguageEntity, 'name' | 'code'>[]) {
    await getDbConnection().transaction(async (entityManager) => {
      for (const language of languages) {
        const testLanguage = new LanguageEntity();
        testLanguage.name = language.name;
        testLanguage.code = language.code;
        await entityManager.save(LanguageEntity, testLanguage);
      }
    });
  },

  async saveTestNames(names: (Pick<NameEntity, 'name' | 'type'> & { languageCode: string })[]) {
    await getDbConnection().transaction(async (entityManager) => {
      for (const name of names) {
        const testName = new NameEntity();
        testName.name = name.name;
        testName.type = name.type;
        testName.language =
          (await entityManager.getRepository(LanguageEntity).findOne({ where: { code: name.languageCode } })) ??
          entityManager.getRepository(LanguageEntity).create({ code: name.languageCode, name: name.languageCode });
        await entityManager.save(NameEntity, testName);
      }
    });
  },

  async saveTestTags(tags: { name: string }[]) {
    await getDbConnection().transaction(async (entityManager) => {
      for (const tag of tags) {
        const testTag = new TagEntity();
        testTag.names = [entityManager.getRepository(NameEntity).create({ name: tag.name, type: 'Tag' })];
        await entityManager.save(TagEntity, testTag);
      }
    });
  },

  async saveTestBios(bios: Pick<BioEntity, 'bio'>[]) {
    await getDbConnection().transaction(async (entityManager) => {
      for (const bio of bios) {
        const testBio = new BioEntity();
        testBio.bio = bio.bio;
        testBio.language =
          (await entityManager.getRepository(LanguageEntity).findOne({ where: { code: 'TL' } })) ??
          entityManager.getRepository(LanguageEntity).create({ code: 'TL', name: 'TestLanguage' });
        await entityManager.save(BioEntity, testBio);
      }
    });
  },

  async saveTestPersons(persons: { name: string; id?: string }[]) {
    await getDbConnection().transaction(async (entityManager) => {
      for (const person of persons) {
        const testPerson = new PersonEntity();
        if (person.id) testPerson.id = person.id;
        testPerson.name = person.name;
        await entityManager.save(PersonEntity, testPerson);
      }
    });
  },

  async saveTestFragments(videos: Pick<BunnyVideo, 'guid' | 'title' | 'length'>[]) {
    await getDbConnection().transaction(async (entityManager) => {
      for (const video of videos) {
        const testFragment = await parseVideoToFragment(video as any);
        await entityManager.save(FragmentEntity, testFragment);
      }
    });
  },

  async saveTestDescriptions(descriptions: string[][]) {
    await getDbConnection().transaction(async (entityManager) => {
      for (const description of descriptions) {
        const testDescription = new DescriptionEntity();
        testDescription.description = description;
        await entityManager.save(DescriptionEntity, testDescription);
      }
    });
  },

  async createTestDescriptions(
    descriptions: Array<{ languageCode: string; description: string[]; narrative: NarrativeEntity }>
  ) {
    const dbConnection = getDbConnection();
    const languageRepo = dbConnection.getRepository(LanguageEntity);

    const descriptionEntities = await Promise.all(
      descriptions.map(async (desc) => {
        const language = await languageRepo.findOneBy({ code: desc.languageCode });
        if (!language) {
          throw new Error(`Language with code '${desc.languageCode}' not found`);
        }
        const description = new DescriptionEntity();
        description.language = language;
        description.description = desc.description;
        description.narrative = desc.narrative;
        return description;
      })
    );

    return dbConnection.manager.save(descriptionEntities);
  },

  async createTestNames(
    names: Array<{ languageCode: string; name: string; type: string; narrative: NarrativeEntity }>
  ) {
    const dbConnection = getDbConnection();
    const languageRepo = dbConnection.getRepository(LanguageEntity);

    const nameEntities = await Promise.all(
      names.map(async (name) => {
        const language = await languageRepo.findOneBy({ code: name.languageCode });
        if (!language) {
          throw new Error(`Language with code '${name.languageCode}' not found`);
        }
        const nameEntity = new NameEntity();
        nameEntity.language = language;
        nameEntity.name = name.name;
        nameEntity.type = name.type as any;
        nameEntity.narrative = name.narrative;
        return nameEntity;
      })
    );

    return dbConnection.manager.save(nameEntities);
  },

  async createTestNarrativeFragments(
    fragments: Array<{ fragmentId: string; sequence: number; narrative: NarrativeEntity }>
  ) {
    const dbConnection = getDbConnection();
    const fragmentRepo = dbConnection.getRepository(FragmentEntity);

    const fragmentEntities = await Promise.all(
      fragments.map(async (fragment) => {
        const fragmentEntity = await fragmentRepo.findOneBy({ id: fragment.fragmentId });
        const narrativeFragment = new NarrativeFragmentEntity();
        if (!fragmentEntity) {
          throw new Error(`Fragment with id '${fragment.fragmentId}' not found`);
        }
        narrativeFragment.fragment = fragmentEntity;
        narrativeFragment.sequence = fragment.sequence;
        narrativeFragment.narrative = fragment.narrative;
        return narrativeFragment;
      })
    );

    return dbConnection.manager.save(fragmentEntities);
  },
};
