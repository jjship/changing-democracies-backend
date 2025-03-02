import { FastifyBaseLogger } from 'fastify';
import { DataSource } from 'typeorm';
import { BunnyVideo } from '../../services/bunnyStream/bunnyStreamApiClient';
import { FragmentEntity } from '../../db/entities/Fragment';
import { PersonEntity } from '../../db/entities/Person';
import { CountryEntity } from '../../db/entities/Country';
import { serializeFilmsCollection } from './parseLegacyFragments';
import { LanguageEntity } from '../../db/entities/Language';

const BATCH_SIZE = 50; // Process in smaller batches to reduce memory usage
const OPERATION_TIMEOUT_MS = 3 * 60 * 1000; // 3 minutes timeout

// Helper to create a timeout promise
const createTimeout = (ms: number) =>
  new Promise<never>((_, reject) => setTimeout(() => reject(new Error(`Operation timed out after ${ms}ms`)), ms));

export const syncLegacyFragments =
  ({ dbConnection, logger }: { dbConnection: DataSource; logger: FastifyBaseLogger }) =>
  async ({ bunnyVideos }: { bunnyVideos: BunnyVideo[] }) => {
    const moduleLogger = logger.child({ module: 'sync-legacy-fragments' });
    moduleLogger.info({ videoCount: bunnyVideos.length }, 'Starting legacy fragments sync');

    try {
      // Add a global timeout to the entire operation
      return await Promise.race([
        (async () => {
          // Limit the number of videos to process to prevent memory issues
          const MAX_VIDEOS = 500;
          const videosToProcess = bunnyVideos.length > MAX_VIDEOS ? bunnyVideos.slice(0, MAX_VIDEOS) : bunnyVideos;

          if (videosToProcess.length < bunnyVideos.length) {
            moduleLogger.warn(
              { totalVideos: bunnyVideos.length, processedVideos: videosToProcess.length },
              'Limited the number of videos to process to prevent memory exhaustion'
            );
          }

          const { films } = serializeFilmsCollection({ videos: videosToProcess });

          if (!films || films.length === 0) {
            moduleLogger.warn('No films to process after serialization');
            return;
          }

          moduleLogger.info({ filmCount: films.length }, 'Serialized films for processing');

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

          // Process in batches to reduce memory pressure
          for (let i = 0; i < films.length; i += BATCH_SIZE) {
            moduleLogger.info(
              { batch: Math.floor(i / BATCH_SIZE) + 1, totalBatches: Math.ceil(films.length / BATCH_SIZE) },
              'Processing batch of films'
            );

            const batch = films.slice(i, i + BATCH_SIZE);

            await dbConnection.transaction(async (entityManager) => {
              for (const { guid, country: countryName, person: personName } of batch) {
                try {
                  if (!guid || !countryName || !personName) {
                    moduleLogger.warn({ guid, countryName, personName }, 'Missing required data for film, skipping');
                    continue;
                  }

                  const fragment = await entityManager
                    .createQueryBuilder(FragmentEntity, 'fragment')
                    .where({ id: guid })
                    .getOne();

                  if (!fragment) {
                    moduleLogger.warn({ id: guid }, 'Could not find fragment, skipping');
                    continue;
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
                    if (!person.fragments) {
                      person.fragments = [fragment];
                    } else if (!person.fragments.find((fr) => fr.id === fragment.id)) {
                      person.fragments.push(fragment);
                    }
                  }

                  await entityManager.save(PersonEntity, person);

                  const countryCode = countriesMap.get(countryName);

                  if (!countryCode) {
                    moduleLogger.warn({ countryName }, 'Could not find country code, skipping');
                    continue;
                  }

                  let country = await entityManager.findOne(CountryEntity, {
                    where: { code: countryCode },
                    relations: ['persons'],
                  });

                  if (!country) {
                    moduleLogger.warn({ countryName, countryCode }, 'Could not find country, skipping');
                    continue;
                  }

                  if (!country.persons) {
                    country.persons = [person];
                  } else if (!country.persons.find((p) => p.id === person.id)) {
                    country.persons.push(person);
                  }

                  await entityManager.save(CountryEntity, country);
                  await entityManager.save(FragmentEntity, fragment);
                } catch (err) {
                  moduleLogger.error(
                    { err, guid, countryName, personName },
                    'Error processing individual film, continuing with next'
                  );
                  // Continue with next film instead of failing the entire batch
                }
              }
            });

            // Force garbage collection if available
            if (global.gc) {
              try {
                global.gc();
              } catch (err) {
                // Ignore errors during GC
              }
            }
          }

          moduleLogger.info('Finished sync successfully');
        })(),
        createTimeout(OPERATION_TIMEOUT_MS),
      ]);
    } catch (err) {
      // Check if this is a timeout or other error
      if ((err as Error).message.includes('timed out')) {
        moduleLogger.error({ err }, 'Global timeout reached during legacy fragments sync');
      } else {
        moduleLogger.error({ err }, 'Error during legacy fragments sync');
      }
      // Don't rethrow - we want the app to continue even if this sync fails
    }
  };
