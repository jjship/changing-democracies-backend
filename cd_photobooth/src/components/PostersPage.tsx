import { MouseEventHandler, useEffect, useState } from 'react';
import { PosterMetadata, photoboothApi } from '../api/photobooth-api';
import { Skeleton } from './ui/skeleton';
import { useBoothContext } from './BoothContext';
import { PostersNavFooter } from './PostersNavFooter';

interface PostersPageProps {
  initialPosters: PosterMetadata[];
  location?: string;
  isLoading: boolean;
}

export const PostersPage: React.FC<PostersPageProps> = ({ initialPosters, isLoading }) => {
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [filteredPosters, setFilteredPosters] = useState<PosterMetadata[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const { setPrevLocations, setStage } = useBoothContext();

  useEffect(() => {
    const getLocations = () => {
      const newLocations = new Set<string>();
      initialPosters.forEach((poster) => {
        const posterLocation = poster.fileName.split('.')[0].split('_').pop();
        if (posterLocation) newLocations.add(posterLocation);
      });
      setPrevLocations(Array.from(newLocations));
      setLocations(Array.from(newLocations));
    };

    if (initialPosters) {
      setFilteredPosters(initialPosters);
      getLocations();
    }
  }, [initialPosters, setPrevLocations]);

  const handleFilterClick: MouseEventHandler<HTMLButtonElement> = (e) => {
    const filterPosters = (chosenLocation: string) =>
      initialPosters.filter((poster) => poster.fileName.includes(chosenLocation));
    const clickedLocation = (e.target as HTMLButtonElement).value;
    const locationToSet = selectedLocation === clickedLocation ? null : clickedLocation;

    if (locationToSet === null) {
      setFilteredPosters(initialPosters);
    } else {
      setFilteredPosters(filterPosters(locationToSet));
    }
    setSelectedLocation(locationToSet);
  };

  const handlePosterMakerClick = () => setStage(1);

  return isLoading || !filteredPosters ? (
    <div className="grid h-screen w-full grid-cols-3 gap-x-16 gap-y-24 bg-black_bg p-20">
      {Array(9)
        .fill(1)
        .map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
    </div>
  ) : (
    <div className="bg-black_bg">
      <div className="grid min-h-screen w-screen grid-cols-3 gap-x-16 gap-y-24 p-20">
        {filteredPosters.map((poster) => (
          <div key={poster.id} className="w-full">
            <img
              src={photoboothApi.getPosterImageUrl(poster.fileName)}
              alt={poster.fileName}
              className="w-full"
              loading="lazy"
            />
          </div>
        ))}
      </div>
      <PostersNavFooter
        locations={locations}
        selectedLocation={selectedLocation}
        handleFilterClick={handleFilterClick}
        handleNavClick={handlePosterMakerClick}
      />
    </div>
  );
};
