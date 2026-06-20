import { useEffect, useState } from 'react';
import { Box, Container, Heading, useToast } from '@chakra-ui/react';
import { Video, videosApi } from '../api/videos';
import { VideoList } from '../components/videos/VideoList';
import { VideoForm } from '../components/videos/VideoForm';

export function VideosPage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [refresh, setRefresh] = useState(false);
  const [editingVideo, setEditingVideo] = useState<Video | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    loadVideos();
  }, [refresh]);

  const loadVideos = async () => {
    setIsLoading(true);
    try {
      setVideos(await videosApi.getVideos());
    } catch (_error) {
      toast({ title: 'Error loading videos, please try again', status: 'error', duration: 3000 });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = () => {
    setRefresh(!refresh);
    setEditingVideo(null);
  };

  return (
    <Container maxW="container.lg" py={8}>
      <Heading mb={6}>Edit Videos</Heading>

      <Box>
        {editingVideo ? (
          <VideoForm video={editingVideo} onSave={handleSave} onCancel={() => setEditingVideo(null)} />
        ) : (
          <VideoList videos={videos} isLoading={isLoading} onEdit={setEditingVideo} />
        )}
      </Box>
    </Container>
  );
}
