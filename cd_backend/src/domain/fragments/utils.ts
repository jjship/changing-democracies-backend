import { FragmentEntity } from '../../db/entities/Fragment';
import { ENV } from '../../env';
import { BunnyVideo } from '../../services/bunnyStream/bunnyStreamApiClient';

export { parseVideoToFragment };

function parseVideoToFragment(video: BunnyVideo) {
  const fragment = new FragmentEntity();

  const { guid, title, length } = video;

  fragment.id = guid;
  fragment.title = title;
  fragment.duration_sec = length;
  fragment.player_url = getPlayerUrl(guid);
  fragment.thumbnail_url = getThumbnailUrl(guid);

  return fragment;
}

const getThumbnailUrl = (filmId: string) => `https://${ENV.BUNNY_STREAM_PULL_ZONE}.b-cdn.net/${filmId}/thumbnail.jpg`;

const getPlayerUrl = (filmId: string) =>
  `https://iframe.mediadelivery.net/embed/${ENV.BUNNY_STREAM_LIBRARY_ID}/${filmId}`;
