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
import { TagCategoryEntity } from '../db/entities/TagCategory';
import { In } from 'typeorm';

export const testDb = {
  async saveTestCountries(countries: { name: string; code: string }[]) {
    const ids: string[] = [];

    await getDbConnection().transaction(async (entityManager) => {
      for (const country of countries) {
        const testCountry = new CountryEntity();
        const language = await entityManager.findOne(LanguageEntity, { where: { code: 'EN' } });
        if (!language) {
          throw new Error(`Language with code 'EN' not found`);
        }
        testCountry.names = [
          entityManager.getRepository(NameEntity).create({ name: country.name, type: 'Country', language }),
        ];
        testCountry.code = country.code;
        const savedCountry = await entityManager.save(CountryEntity, testCountry);
        ids.push(savedCountry.id);
      }
    });

    return ids;
  },

  async saveTestPersons(names: string[]): Promise<string[]> {
    const ids: string[] = [];

    await getDbConnection().transaction(async (entityManager) => {
      for (const name of names) {
        const testPerson = new PersonEntity();
        testPerson.name = name;
        testPerson.normalizedName = name.toLowerCase().replace(/\s+/g, '-');
        const savedPerson = await entityManager.save(PersonEntity, testPerson);
        ids.push(savedPerson.id);
      }
    });

    return ids;
  },

  async saveTestLanguages(languages: Pick<LanguageEntity, 'name' | 'code'>[]) {
    await getDbConnection().transaction(async (entityManager) => {
      for (const language of languages) {
        const testLanguage = new LanguageEntity();
        testLanguage.name = language.name;
        testLanguage.code = language.code.toUpperCase();
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

        // Find existing language or create and save a new one
        let language = await entityManager
          .getRepository(LanguageEntity)
          .findOne({ where: { code: name.languageCode } });
        if (!language) {
          language = entityManager.getRepository(LanguageEntity).create({
            code: name.languageCode,
            name: name.languageCode,
          });
          language = await entityManager.save(LanguageEntity, language);
        }

        testName.language = language;
        await entityManager.save(NameEntity, testName);
      }
    });
  },

  async saveTestTags(tags: { name: string }[]) {
    await getDbConnection().transaction(async (entityManager) => {
      for (const tag of tags) {
        const testTag = new TagEntity();
        const language = await entityManager.findOne(LanguageEntity, { where: { code: 'EN' } });
        if (!language) {
          throw new Error(`Language with code 'EN' not found`);
        }
        testTag.names = [
          entityManager.getRepository(NameEntity).create({
            name: tag.name,
            type: 'Tag',
            language,
          }),
        ];
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

  async saveTestFragments(videos: (Pick<BunnyVideo, 'guid' | 'title' | 'length'> & { personId?: string })[]) {
    await getDbConnection().transaction(async (entityManager) => {
      for (const video of videos) {
        const testFragment = parseVideoToFragment(video as any);

        if (video.personId) {
          const person = await entityManager.findOne(PersonEntity, { where: { id: video.personId } });
          if (person) {
            testFragment.person = person;
          }
        }

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

  async saveTestPerson(person: {
    name: string;
    normalizedName: string;
    countryCode: string;
    bios?: Array<{ languageCode: string; bio: string }>;
  }): Promise<PersonEntity> {
    const dbConnection = getDbConnection();

    return await dbConnection.transaction(async (entityManager) => {
      const testPerson = new PersonEntity();
      testPerson.name = person.name;
      testPerson.normalizedName = person.normalizedName;
      const country = await entityManager.findOne(CountryEntity, {
        where: { code: person.countryCode },
      });
      if (!country) {
        throw new Error(`Country with code '${person.countryCode}' not found`);
      }
      testPerson.country = country;

      if (person.bios) {
        testPerson.bios = await Promise.all(
          person.bios.map(async (bio) => {
            const language = await entityManager.findOne(LanguageEntity, {
              where: { code: bio.languageCode.toUpperCase() },
            });
            if (!language) {
              throw new Error(`Language with code '${bio.languageCode}' not found`);
            }

            const bioEntity = new BioEntity();
            bioEntity.bio = bio.bio;
            bioEntity.language = language;
            return entityManager.save(BioEntity, bioEntity);
          })
        );
      }

      return await entityManager.save(PersonEntity, testPerson);
    });
  },

  async saveTestTagCategories(
    categories: Array<{ names: Array<{ languageCode: string; name: string }>; tagIds?: string[] }>
  ) {
    const dbConnection = getDbConnection();
    const categoryRepo = dbConnection.getRepository(TagCategoryEntity);
    const languageRepo = dbConnection.getRepository(LanguageEntity);
    const tagRepo = dbConnection.getRepository(TagEntity);

    return await dbConnection.transaction(async (entityManager) => {
      const savedCategories: TagCategoryEntity[] = [];

      for (const category of categories) {
        const tagCategory = new TagCategoryEntity();

        // Create names with proper language relations
        tagCategory.names = await Promise.all(
          category.names.map(async (n) => {
            const language = await languageRepo.findOneByOrFail({ code: n.languageCode });
            const name = new NameEntity();
            name.language = language;
            name.name = n.name;
            name.type = 'TagCategory';
            name.tagCategory = tagCategory;
            return name;
          })
        );

        // Handle tag associations if tagIds are provided
        if (category.tagIds && category.tagIds.length > 0) {
          const tags = await tagRepo.findBy({
            id: In(category.tagIds),
          });
          tagCategory.tags = tags;
        }

        const savedCategory = await entityManager.save(TagCategoryEntity, tagCategory);
        savedCategories.push(savedCategory);
      }

      return savedCategories;
    });
  },
};
