import { useState, useEffect } from 'react';
import { Box, useToast } from '@chakra-ui/react';
import { Narrative, narrativesApi } from '../api/narratives';
import { fragmentsApi, Fragment } from '../api/fragments';
import { personsApi, Person } from '../api/persons';
import NarrativeEditor from '../components/narratives/NarrativeEditor';
import { NarrativeList } from '../components/narratives/NarrativesList';

export function NarrativesPage() {
  const [narratives, setNarratives] = useState<Narrative[]>([]);
  const [fragments, setFragments] = useState<Fragment[]>([]);
  const [persons, setPersons] = useState<Person[]>([]);
  const [refresh, setRefresh] = useState(false);
  const [editingNarrative, setEditingNarrative] = useState<Narrative | undefined | null>(undefined);
  const toast = useToast();
  useEffect(() => {
    try {
      narrativesApi.getNarratives().then(setNarratives);
      fragmentsApi.getFragments({}).then((response) => setFragments(response.data));
      personsApi.getPersons().then(setPersons);
    } catch (error) {
      toast({
        title: 'Error loading persons, please try again',
        status: 'error',
        duration: 3000,
      });
    }
  }, [refresh]);

  const handleSave = () => {
    setRefresh(!refresh);
    setEditingNarrative(undefined);
  };

  const handleEdit = (narrative: Narrative) => {
    setEditingNarrative(narrative);
  };

  const handleDelete = async (id: string) => {
    await narrativesApi.deleteNarrative(id);
    setRefresh(!refresh);
  };

  const handleAdd = () => {
    setEditingNarrative(null);
  };

  const handleCancel = () => {
    setEditingNarrative(undefined);
  };

  return (
    fragments.length && (
      <Box>
        {editingNarrative === undefined && (
          <NarrativeList narratives={narratives} onEdit={handleEdit} onDelete={handleDelete} onAdd={handleAdd} />
        )}

        {editingNarrative !== undefined && (
          <NarrativeEditor
            narrative={editingNarrative}
            onSave={handleSave}
            onCancel={handleCancel}
            fragments={fragments}
            persons={persons}
          />
        )}
      </Box>
    )
  );
}
