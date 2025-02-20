import { Text, Button, Flex } from '@chakra-ui/react';
import { Narrative } from '../../api/narratives';

function pickName(narrative: Narrative) {
  const englishName = narrative.names.find((nm) => nm.languageCode.toUpperCase() === 'EN')?.name;

  if (!englishName) {
    return narrative.names.find((name) => name.name.length > 0)?.name ?? '';
  }

  return englishName;
}

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
    <Flex m={'auto'} gap={4} p={4} direction="column">
      {narratives.map((narrative) => (
        <Flex direction="column" gap={4} key={narrative.id} p={4} borderWidth={1} borderRadius="md">
          <Text>{pickName(narrative)}</Text>
          <Flex gap={4}>
            <Button colorScheme={'teal'} aria-label="Edit narrative" onClick={() => onEdit(narrative)}>
              Edit
            </Button>
            <Button colorScheme={'orange'} aria-label="Delete narrative" onClick={() => onDelete(narrative.id)}>
              Delete
            </Button>
          </Flex>
        </Flex>
      ))}
      <Button colorScheme={'green'} onClick={onAdd}>
        Add Narrative
      </Button>
    </Flex>
  );
}
