import { DataSource } from 'typeorm';
import { FragmentEntity } from '../../db/entities/Fragment';
import { ENV } from '../../env';
import { fragmentSchema } from '../../http/fragments/fragment.schema';
import { BunnyVideo } from '../../services/bunnyStream/bunnyStreamApiClient';
import { NameEntity } from '../../db/entities/Name';

export { getFragments } from './getFragments';
export { syncFragments } from './syncFragments';

export { parseFragmentEntity, parseVideoToFragment };

export type FragmentAttributes = typeof fragmentSchema.static;

export type FragmentPayload = { type: 'fragment'; id: string; attributes: FragmentAttributes };

function parseFragmentEntity(fragment: FragmentEntity): FragmentPayload {
  return {
    type: 'fragment' as const,
    id: fragment.id,
    attributes: {
      title: fragment.title,
      durationSec: fragment.durationSec,
      playerUrl: fragment.playerUrl,
      thumbnailUrl: fragment.thumbnailUrl,
      person: fragment.person ? { id: fragment.person.id, name: fragment.person.name } : null,
      tags:
        fragment.tags?.map(({ id, names }) => ({
          id,
          names: names?.map((name) => ({ languageCode: name.language.code, name: name.name })) ?? [],
        })) ?? [],
      country: fragment.person?.country
        ? { id: fragment.person.country.id, name: fragment.person.country.names?.[0]?.name ?? '' }
        : null,
      narratives_ids: fragment.narrativeFragments?.map((nf) => nf.narrative.id) ?? [],
    },
  };
}

const parseVideoToFragment = (video: BunnyVideo) => {
  const fragment = new FragmentEntity();

  const { guid, title, length } = video;

  fragment.id = guid;
  fragment.title = title;
  fragment.durationSec = length;
  fragment.playerUrl = getPlayerUrl(guid);
  fragment.thumbnailUrl = getThumbnailUrl(guid);

  return fragment;
};

const getThumbnailUrl = (filmId: string) => `https://${ENV.BUNNY_STREAM_PULL_ZONE}.b-cdn.net/${filmId}/thumbnail.jpg`;

const getPlayerUrl = (filmId: string) =>
  `https://iframe.mediadelivery.net/embed/${ENV.BUNNY_STREAM_LIBRARY_ID}/${filmId}`;
