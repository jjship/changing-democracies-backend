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
  const [isLoading, setIsLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    loadData();
  }, [refresh]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [narrativesData, fragmentsResponse, personsData] = await Promise.all([
        narrativesApi.getNarratives(),
        fragmentsApi.getFragments({}),
        personsApi.getPersons(),
      ]);
      setNarratives(narrativesData);
      setFragments(fragmentsResponse.data);
      setPersons(personsData);
    } catch (error) {
      toast({
        title: 'Error loading data, please try again',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setIsLoading(false);
    }
  };

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
    <Box>
      {editingNarrative === undefined && (
        <NarrativeList
          narratives={narratives}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onAdd={handleAdd}
          isLoading={isLoading}
        />
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
  );
}
