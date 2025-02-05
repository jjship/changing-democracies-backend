import { FastifyBaseLogger } from 'fastify';
import { DataSource } from 'typeorm';
import { BunnyVideo } from '../../services/bunnyStream/bunnyStreamApiClient';
import { FragmentEntity } from '../../db/entities/Fragment';
import { PersonEntity } from '../../db/entities/Person';
import { CountryEntity } from '../../db/entities/Country';
import { serializeFilmsCollection } from './parseLegacyFragments';
import { LanguageEntity } from '../../db/entities/Language';

export const syncLegacyFragments =
  ({ dbConnection, logger }: { dbConnection: DataSource; logger: FastifyBaseLogger }) =>
  async ({ bunnyVideos }: { bunnyVideos: BunnyVideo[] }) => {
    const moduleLogger = logger.child({ module: 'sync-legacy-fragments' });
    moduleLogger.info('starting sync');

    const { films } = serializeFilmsCollection({ videos: bunnyVideos });

    let englishLanguage = await dbConnection.getRepository(LanguageEntity).findOne({ where: { code: 'EN' } });
    if (!englishLanguage) {
      englishLanguage = new LanguageEntity();
      englishLanguage.name = 'English';
      englishLanguage.code = 'EN';
      await dbConnection.getRepository(LanguageEntity).save(englishLanguage);
    }

    const countriesCodes = [
      { name: 'BELGIUM', code: 'BE' },
      { name: 'CROATIA', code: 'HR' },
      { name: 'CZECH REPUBLIC', code: 'CZ' },
      { name: 'NETHERLANDS', code: 'NL' },
      { name: 'FRANCE', code: 'FR' },
      { name: 'GERMANY', code: 'DE' },
      { name: 'GREECE', code: 'GR' },
      { name: 'LITHUANIA', code: 'LT' },
      { name: 'POLAND', code: 'PL' },
      { name: 'PORTUGAL', code: 'PT' },
      { name: 'ROMANIA', code: 'RO' },
      { name: 'SPAIN', code: 'ES' },
    ];

    const countriesMap = new Map(countriesCodes.map((country) => [country.name, country.code]));

    await dbConnection.transaction(async (entityManager) => {
      for (const { guid, country: countryName, person: personName } of films) {
        const fragment = await entityManager
          .createQueryBuilder(FragmentEntity, 'fragment')
          .where({ id: guid })
          .getOne();

        if (!fragment) {
          moduleLogger.warn({ id: guid }, 'Could not find fragment');
          break;
        }

        let person = await entityManager.findOne(PersonEntity, {
          where: { name: personName },
          relations: ['fragments'],
        });

        if (!person) {
          person = new PersonEntity();
          person.name = personName;
          person.fragments = [fragment];
        } else {
          if (!person.fragments?.find((fr) => fr.id === fragment.id)) {
            person.fragments!.push(fragment);
          }
        }

        await entityManager.save(PersonEntity, person);

        const countryCode = countriesMap.get(countryName);

        let country = await entityManager.findOne(CountryEntity, {
          where: { code: countryCode },
          relations: ['persons'],
        });

        if (!country) {
          moduleLogger.error({ countryName }, 'COULD NOT FIND COUNTRY');
          break;
        }

        if (!country?.persons?.find((p) => p.id === person.id)) {
          country.persons!.push(person);
        }

        await entityManager.save(CountryEntity, country);

        await entityManager.save(FragmentEntity, fragment);
      }
    });

    moduleLogger.info('Finished sync');
  };
