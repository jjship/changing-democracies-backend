import { AspectRatio } from '@chakra-ui/react';

export function VideoPlayer({ videoId }: { videoId: string }) {
  const libraryId = import.meta.env.VITE_LIBRARY_ID;

  return (
    <AspectRatio ratio={16 / 9} mb={4} borderRadius="md" overflow="hidden">
      <iframe
        src={`https://iframe.mediadelivery.net/embed/${libraryId}/${videoId}?autoplay=false`}
        loading="lazy"
        title="Video preview"
        allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
        allowFullScreen
        style={{ border: 'none' }}
      />
    </AspectRatio>
  );
}
