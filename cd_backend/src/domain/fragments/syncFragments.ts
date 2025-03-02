import { FastifyBaseLogger } from 'fastify';
import { DataSource } from 'typeorm';
import { BunnyStreamApiClient, BunnyVideo } from '../../services/bunnyStream/bunnyStreamApiClient';
import { FragmentEntity } from '../../db/entities/Fragment';
import { parseVideoToFragment } from './fragments.api';
import { syncLegacyFragments } from './syncLegacyFragments';

const SYNC_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

// Helper to create a timeout promise
const createTimeout = (ms: number) =>
  new Promise<never>((_, reject) => setTimeout(() => reject(new Error(`Operation timed out after ${ms}ms`)), ms));

export async function syncFragments({
  dbConnection,
  bunnyStream,
  logger,
}: {
  dbConnection: DataSource;
  bunnyStream: BunnyStreamApiClient;
  logger: FastifyBaseLogger;
}) {
  const syncLogger = logger.child({ module: 'sync-fragments' });

  try {
    // Add a global timeout to the entire sync operation
    await Promise.race([
      (async () => {
        syncLogger.info('Starting fragment synchronization');

        let bunnyVideos: BunnyVideo[] = [];
        try {
          syncLogger.info('Fetching videos from Bunny Stream');
          bunnyVideos = await bunnyStream.getVideos();
          syncLogger.info({ videoCount: bunnyVideos.length }, 'Successfully fetched videos from Bunny Stream');
        } catch (err) {
          syncLogger.error({ err }, 'Failed to fetch videos from Bunny Stream. Sync operation aborted.');
          return; // Exit early but don't crash the app
        }

        // If we didn't get any videos, log it but don't crash
        if (bunnyVideos.length === 0) {
          syncLogger.warn('No videos fetched from Bunny Stream. Sync operation aborted.');
          return;
        }

        let dbFragments: FragmentEntity[] = [];
        try {
          syncLogger.info('Fetching fragments from database');
          dbFragments = await dbConnection.getRepository(FragmentEntity).find();
          syncLogger.info({ fragmentCount: dbFragments.length }, 'Successfully fetched fragments from database');
        } catch (err) {
          syncLogger.error({ err }, 'Failed to fetch fragments from database. Sync operation aborted.');
          return; // Exit early but don't crash the app
        }

        const videosToAdd = getVideosToAdd({
          videos: bunnyVideos,
          fragments: dbFragments,
        });

        const fragmentsToRemove = getFragmentsToRemove({
          videos: bunnyVideos,
          fragments: dbFragments,
        });

        syncLogger.info({ videosToAdd: videosToAdd.length, fragmentsToRemove: fragmentsToRemove.length });

        if (videosToAdd.length) {
          try {
            const newFragments = videosToAdd.map((video) => parseVideoToFragment(video));
            await dbConnection.getRepository(FragmentEntity).save(newFragments);
            syncLogger.info(
              {
                newFragments: newFragments.map((fr) => fr.title),
                count: newFragments.length,
              },
              'Added new fragments to database'
            );

            try {
              await syncLegacyFragments({ dbConnection, logger })({ bunnyVideos: videosToAdd });
              syncLogger.info('Successfully synced legacy fragments');
            } catch (legacyErr) {
              // Log but don't fail the entire sync
              syncLogger.error({ err: legacyErr }, 'Error syncing legacy fragments, but sync process continues');
            }
          } catch (err) {
            syncLogger.error({ err }, 'Failed to add new fragments to database');
            // Continue with removal even if addition failed
          }
        }

        if (fragmentsToRemove.length) {
          try {
            await dbConnection.getRepository(FragmentEntity).remove(fragmentsToRemove);
            syncLogger.info(
              {
                removedFragments: fragmentsToRemove.map((fr) => fr.title),
                count: fragmentsToRemove.length,
              },
              'Removed fragments from database'
            );
          } catch (err) {
            syncLogger.error({ err }, 'Failed to remove fragments from database');
          }
        }

        syncLogger.info('Fragment synchronization completed successfully');
      })(),
      createTimeout(SYNC_TIMEOUT_MS),
    ]);
  } catch (err) {
    // Check if this is a timeout
    if ((err as Error).message.includes('timed out')) {
      syncLogger.error({ err }, 'Global timeout reached during fragment synchronization.');
    } else {
      syncLogger.error({ err }, 'Error during fragment synchronization.');
    }
    // Don't rethrow - we want the app to continue running even if sync fails
  }
}

const getVideosToAdd = ({ videos, fragments }: { videos: BunnyVideo[]; fragments: FragmentEntity[] }) =>
  videos.filter((video) => !fragments.map(({ id }) => id).includes(video.guid));

const getFragmentsToRemove = ({ videos, fragments }: { videos: BunnyVideo[]; fragments: FragmentEntity[] }) =>
  fragments.filter((fragment) => !videos.map(({ guid }) => guid).includes(fragment.id));
