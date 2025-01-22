import { ENV } from '../../env';
import { BunnyVideo } from '../../services/bunnyStream/api/videos';

type FilmsCollection = {
  films: FilmData[];
  tags: string[];
  countries: string[];
  people: string[];
};

type FilmData = Pick<BunnyVideo, 'guid' | 'title' | 'length'> & {
  tags: string[];
  person: string;
  country: string;
  playerUrl: string;
  thumbnailUrl: string;
};

export function serializeFilmsCollection({ videos }: { videos: BunnyVideo[] }): FilmsCollection {
  const allTags = videos.reduce((prev: Set<string>, film: BunnyVideo) => {
    parseTags(film.metaTags).forEach((tag) => prev.add(tag));
    return prev;
  }, new Set<string>());

  const films: FilmData[] = videos.map((film) => ({
    guid: film.guid,
    title: film.title,
    length: film.length,
    tags: parseTags(film.metaTags),
    person: film.title.split('_')[2]?.trim(),
    country: film.title.split('_')[1]?.trim(),
    playerUrl: getFilmUrl(film.guid),
    thumbnailUrl: getThumbnail(film.guid),
  }));

  const countries = new Set<string>();

  const people = new Set<string>();

  for (const f of films) {
    countries.add(f.country);
    people.add(f.person);
  }

  return {
    films,
    tags: Array.from(allTags).sort((a, b) => a.localeCompare(b)),
    countries: Array.from(countries).sort((a, b) => a.localeCompare(b)),
    people: Array.from(people).sort((a, b) => a.localeCompare(b)),
  };
}

function parseTags(
  metaTags: {
    property: string;
    value: string;
  }[]
): string[] {
  if (!metaTags) return [];
  const tags: string[] | undefined = metaTags
    .find((tag) => tag.property === 'tags')
    ?.value?.split(',')
    .map((tag) => tag.trim());
  return tags ?? [];
}

const getThumbnail = (filmId: string) => `https://${ENV.BUNNY_STREAM_PULL_ZONE}.b-cdn.net/${filmId}/thumbnail.jpg`;

const getFilmUrl = (filmId: string) =>
  `https://iframe.mediadelivery.net/embed/${ENV.BUNNY_STREAM_LIBRARY_ID}/${filmId}?autoplay=false`;
