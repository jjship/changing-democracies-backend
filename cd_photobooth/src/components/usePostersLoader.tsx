import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { PosterMetadata, photoboothApi } from '../api/photobooth-api';

const fetchPosters = async () => {
  return photoboothApi.listPosters();
};

export const usePostersLoader = () => {
  const {
    data: posters,
    error,
    mutate,
  } = useSWR('photobooth-posters', fetchPosters, {
    revalidateOnFocus: false,
    refreshInterval: 10000,
  });

  const [currentPosters, setCurrentPosters] = useState<PosterMetadata[]>([]);

  useEffect(() => {
    if (posters && posters.length !== currentPosters.length) {
      setCurrentPosters(posters);
    }
  }, [posters, currentPosters]);

  return {
    posters: currentPosters,
    error,
    reloadPosters: mutate,
  };
};
