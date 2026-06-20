import { useEffect, useMemo, useState } from 'react';
import { Box, Button, Container, Flex, Heading, Input, Select, useToast } from '@chakra-ui/react';
import { EnrichedVideo, VideoMeta, videosApi } from '../api/videos';
import { VideoList } from '../components/videos/VideoList';
import { VideoForm } from '../components/videos/VideoForm';

const EMPTY_META: VideoMeta = { personId: null, personName: null, country: null };

export function VideosPage() {
  const [videos, setVideos] = useState<EnrichedVideo[]>([]);
  const [refresh, setRefresh] = useState(false);
  const [editingVideo, setEditingVideo] = useState<EnrichedVideo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [titleQuery, setTitleQuery] = useState('');
  const [personId, setPersonId] = useState('');
  const [country, setCountry] = useState('');
  const toast = useToast();

  useEffect(() => {
    loadVideos();
  }, [refresh]);

  const loadVideos = async () => {
    setIsLoading(true);
    try {
      const [vids, meta] = await Promise.all([
        videosApi.getVideos(),
        videosApi.getVideoMeta().catch(() => new Map<string, VideoMeta>()),
      ]);
      setVideos(vids.map((video) => ({ ...video, ...(meta.get(video.guid) ?? EMPTY_META) })));
    } catch (_error) {
      toast({ title: 'Error loading videos, please try again', status: 'error', duration: 3000 });
    } finally {
      setIsLoading(false);
    }
  };

  const persons = useMemo(() => {
    const byId = new Map<string, string>();
    videos.forEach((video) => {
      if (video.personId && video.personName) byId.set(video.personId, video.personName);
    });
    return [...byId.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [videos]);

  const countries = useMemo(() => {
    const set = new Set<string>();
    videos.forEach((video) => {
      if (video.country) set.add(video.country);
    });
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [videos]);

  const filtered = useMemo(
    () =>
      videos.filter(
        (video) =>
          (!titleQuery || video.title.toLowerCase().includes(titleQuery.toLowerCase())) &&
          (!personId || video.personId === personId) &&
          (!country || video.country === country),
      ),
    [videos, titleQuery, personId, country],
  );

  const handleSave = () => {
    setRefresh(!refresh);
    setEditingVideo(null);
  };

  const hasFilters = !!(titleQuery || personId || country);

  return (
    <Container maxW="container.lg" py={8}>
      <Heading mb={6}>Edit Videos</Heading>

      <Box>
        {editingVideo ? (
          <VideoForm video={editingVideo} onSave={handleSave} onCancel={() => setEditingVideo(null)} />
        ) : (
          <>
            <Flex gap={3} mb={4} wrap="wrap" align="center">
              <Input
                placeholder="Search title…"
                value={titleQuery}
                onChange={(e) => setTitleQuery(e.target.value)}
                maxW="280px"
              />
              <Select placeholder="All persons" value={personId} onChange={(e) => setPersonId(e.target.value)} maxW="220px">
                {persons.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.name}
                  </option>
                ))}
              </Select>
              <Select placeholder="All countries" value={country} onChange={(e) => setCountry(e.target.value)} maxW="200px">
                {countries.map((countryName) => (
                  <option key={countryName} value={countryName}>
                    {countryName}
                  </option>
                ))}
              </Select>
              {hasFilters && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    setTitleQuery('');
                    setPersonId('');
                    setCountry('');
                  }}
                >
                  Clear
                </Button>
              )}
            </Flex>
            <VideoList videos={filtered} isLoading={isLoading} onEdit={setEditingVideo} />
          </>
        )}
      </Box>
    </Container>
  );
}
