import { FastifyBaseLogger } from 'fastify';
import { DataSource } from 'typeorm';
import { BunnyStreamApiClient, BunnyVideo } from '../../services/bunnyStream/bunnyStreamApiClient';
import { FragmentEntity } from '../../db/entities/Fragment';
import { parseVideoToFragment } from './fragments.api';
import { syncLegacyFragments } from './syncLegacyFragments';

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
  const bunnyVideos = await bunnyStream.getVideos();

  const dbFragments = await dbConnection.getRepository(FragmentEntity).find();

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
    const newFragments = await Promise.all(videosToAdd.map(async (video) => parseVideoToFragment(video)));

    await dbConnection.getRepository(FragmentEntity).save(newFragments);

    syncLogger.info({ newFragments: newFragments.map((fr) => fr.title) });

    await syncLegacyFragments({ dbConnection, logger })({ bunnyVideos: videosToAdd });
  }

  if (fragmentsToRemove.length) {
    await dbConnection.getRepository(FragmentEntity).remove(fragmentsToRemove);

    syncLogger.warn({ removedFragments: fragmentsToRemove.map((fr) => fr.title) });
  }
}

const getVideosToAdd = ({ videos, fragments }: { videos: BunnyVideo[]; fragments: FragmentEntity[] }) =>
  videos.filter((video) => !fragments.map(({ id }) => id).includes(video.guid));

const getFragmentsToRemove = ({ videos, fragments }: { videos: BunnyVideo[]; fragments: FragmentEntity[] }) =>
  fragments.filter((fragment) => !videos.map(({ guid }) => guid).includes(fragment.id));
