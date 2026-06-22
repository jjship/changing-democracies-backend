import { useCallback, useEffect, useState } from 'react';
import { Button, Flex, FormLabel, Input, Select, Textarea, VStack, useToast } from '@chakra-ui/react';
import { Video, videosApi } from '../../api/videos';
import { languagesApi, Language } from '../../api/languages';
import { useSaveColor } from '../../hooks/useSaveColor';
import { VideoPlayer } from './VideoPlayer';

export function VideoForm({ video, onSave, onCancel }: { video: Video; onSave: () => void; onCancel: () => void }) {
  const [title, setTitle] = useState(video.title);
  const [languages, setLanguages] = useState<Language[]>([]);
  const [selectedSrclang, setSelectedSrclang] = useState('');
  const [label, setLabel] = useState('');
  const [vtt, setVtt] = useState('');
  const [captionsLoading, setCaptionsLoading] = useState(false);
  const { saveColor, markUnsaved, markSaved } = useSaveColor();
  const toast = useToast();

  const loadLanguages = useCallback(async () => {
    try {
      const langs = await languagesApi.getLanguages();
      setLanguages(langs);
    } catch (_error) {
      toast({ title: 'Error loading languages', status: 'error', duration: 3000 });
    }
  }, [toast]);

  useEffect(() => {
    loadLanguages();
  }, [loadLanguages]);

  const handleSelectLanguage = async (srclang: string) => {
    setSelectedSrclang(srclang);
    if (!srclang) {
      setVtt('');
      setLabel('');
      return;
    }

    const existing = video.captions.find((caption) => caption.srclang === srclang);
    const languageName = languages.find((lang) => lang.code.toLowerCase() === srclang)?.name;
    setLabel(existing?.label ?? languageName ?? srclang);

    setCaptionsLoading(true);
    try {
      setVtt(await videosApi.getCaptions(video.guid, srclang));
    } catch (_error) {
      toast({ title: 'Error loading captions', status: 'error', duration: 3000 });
      setVtt('');
    } finally {
      setCaptionsLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      await videosApi.updateVideo(video.guid, { title });
      if (selectedSrclang && vtt.trim()) {
        await videosApi.uploadCaptions(video.guid, selectedSrclang, { label, vtt });
      }
      toast({ title: 'Video saved successfully', status: 'success', duration: 3000 });
      markSaved();
      onSave();
    } catch (_error) {
      toast({ title: 'Error saving video', status: 'error', duration: 3000 });
      markUnsaved();
    }
  };

  return (
    <VStack spacing={4} align="stretch">
      <VideoPlayer videoId={video.guid} />

      <FormLabel>Title</FormLabel>
      <Input
        value={title}
        onChange={(e) => {
          setTitle(e.target.value);
          markUnsaved();
        }}
        placeholder="Title"
      />

      <FormLabel>Caption language</FormLabel>
      <Select
        placeholder="Select a language"
        value={selectedSrclang}
        onChange={(e) => handleSelectLanguage(e.target.value)}
      >
        {languages.map((lang) => {
          const srclang = lang.code.toLowerCase();
          const hasTrack = video.captions.some((caption) => caption.srclang === srclang);
          return (
            <option key={lang.code} value={srclang}>
              {lang.name}
              {hasTrack ? ' ✓' : ''}
            </option>
          );
        })}
      </Select>

      {selectedSrclang && (
        <>
          <FormLabel>Caption label</FormLabel>
          <Input
            value={label}
            onChange={(e) => {
              setLabel(e.target.value);
              markUnsaved();
            }}
            placeholder="Label"
          />

          <FormLabel>Subtitles (VTT)</FormLabel>
          <Textarea
            value={vtt}
            onChange={(e) => {
              setVtt(e.target.value);
              markUnsaved();
            }}
            placeholder={captionsLoading ? 'Loading…' : 'WEBVTT…'}
            minH="240px"
            fontFamily="mono"
          />
        </>
      )}

      <Flex gap={4}>
        <Button colorScheme="teal" onClick={onCancel}>
          Cancel
        </Button>
        <Button colorScheme={saveColor} onClick={handleSubmit}>
          Save
        </Button>
      </Flex>
    </VStack>
  );
}
