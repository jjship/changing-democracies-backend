import { FC } from 'react';
import { useBoothContext } from './BoothContext';
import { usePostersLoader } from './usePostersLoader';
import { PostersPage } from './PostersPage';

export const PostersGallery: FC = () => {
  const thisStage = 0;
  const { location, stage } = useBoothContext();
  const { posters, error, reloadPosters } = usePostersLoader();

  if (stage !== thisStage) return null;
  if (error) reloadPosters();

  return <PostersPage initialPosters={posters} location={location} isLoading={!posters} />;
};
