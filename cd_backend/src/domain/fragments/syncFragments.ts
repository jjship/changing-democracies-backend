import { FastifyBaseLogger } from 'fastify';
import { DataSource } from 'typeorm';
import { BunnyStreamApiClient, BunnyVideo } from '../../services/bunnyStream/bunnyStreamApiClient';
import { FragmentEntity } from '../../db/entities/Fragment';
import { parseVideoToFragment } from './fragments.api';

export async function syncFragments({
  dbConnection,
  bunnyStream,
  logger,
}: {
  dbConnection: DataSource;
  bunnyStream: BunnyStreamApiClient;
  logger: FastifyBaseLogger;
}) {
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

  if (videosToAdd.length) {
    const newFragments = await Promise.all(videosToAdd.map(async (video) => parseVideoToFragment(video)));

    await dbConnection.getRepository(FragmentEntity).save(newFragments);

    logger.info({ newFragments: newFragments.map((fr) => fr.title) }, 'New Fragments added.');
  }

  if (fragmentsToRemove.length) {
    await dbConnection.getRepository(FragmentEntity).remove(fragmentsToRemove);

    logger.warn(
      { removedFragments: fragmentsToRemove.map((fr) => fr.title) },
      'Removed fragments no longer found in Library'
    );
  }
}

const getVideosToAdd = ({ videos, fragments }: { videos: BunnyVideo[]; fragments: FragmentEntity[] }) =>
  videos.filter((video) => !fragments.map(({ id }) => id).includes(video.guid));

const getFragmentsToRemove = ({ videos, fragments }: { videos: BunnyVideo[]; fragments: FragmentEntity[] }) =>
  fragments.filter((fragment) => !videos.map(({ guid }) => guid).includes(fragment.id));
