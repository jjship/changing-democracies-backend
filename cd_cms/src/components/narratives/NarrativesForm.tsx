import { useState } from 'react';
import { narrativesApi, CreateNarrativeAttributes, Narrative, NarrativeFragment } from '../../api/narratives';
import { Box, Input, Button, Textarea } from '@chakra-ui/react';

export function NarrativeForm({ narrative, onSave }: { narrative?: Narrative; onSave: () => void }) {
  const [title, setTitle] = useState(narrative?.names[0].name ?? '');
  const [description, setDescription] = useState(narrative?.descriptions[0].description.join(' ') ?? '');
  const [fragmentsSequence] = useState<NarrativeFragment[]>(narrative?.fragmentsSequence ?? []);

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
