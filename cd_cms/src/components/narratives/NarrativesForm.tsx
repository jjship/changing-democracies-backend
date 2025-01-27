import { useState, useEffect } from 'react';
import { narrativesApi, CreateNarrativeAttributes, Narrative, NarrativeFragment } from '../../api/narratives';
import { Box, Input, Button, Textarea } from '@chakra-ui/react';

export function NarrativeForm({ narrative, onSave }: { narrative?: Narrative; onSave: () => void }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [fragmentsSequence, setFragmentsSequence] = useState<NarrativeFragment[]>([]);

  useEffect(() => {
    if (narrative) {
      setTitle(narrative.names[0].name);
      setDescription(narrative.descriptions[0].description.join(' '));
      setFragmentsSequence(narrative.fragmentsSequence);
    }
  }, [narrative]);

  const handleSubmit = async () => {
    const narrativeAttributes: CreateNarrativeAttributes = {
      names: [{ languageCode: 'en', name: title }],
      descriptions: [{ languageCode: 'en', description: [description] }],
      fragmentsSequence,
    };

    if (narrative) {
      await narrativesApi.updateNarrative(narrative.id, narrativeAttributes);
    } else {
      await narrativesApi.createNarrative(narrativeAttributes);
    }

    onSave();
  };

  return (
    <Box>
      <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
      <Textarea placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
      {/* Add inputs for fragmentsSequence as needed */}
      <Button onClick={handleSubmit}>{narrative ? 'Update' : 'Save'}</Button>
    </Box>
  );
}
