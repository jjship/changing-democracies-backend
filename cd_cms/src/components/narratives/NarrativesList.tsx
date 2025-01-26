import { Box, Text, Button } from '@chakra-ui/react';
import { Narrative } from '../../api/narratives';

export function NarrativeList({
  narratives,
  onEdit,
  onDelete,
  onAdd,
}: {
  narratives: Narrative[];
  onEdit: (narrative: Narrative) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
}) {
  return (
    <Box>
      <Button onClick={onAdd}>Add Narrative</Button>
      {narratives.map((narrative) => (
        <Box key={narrative.id} p={4} borderWidth={1} borderRadius="md">
          <Text>{narrative.names[0].name}</Text>
          <Button onClick={() => onEdit(narrative)}>Edit</Button>
          <Button onClick={() => onDelete(narrative.id)}>Delete</Button>
        </Box>
      ))}
    </Box>
  );
}
