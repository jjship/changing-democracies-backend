import { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import {
  Box,
  Card,
  CardBody,
  Input,
  Button,
  Select,
  Textarea,
  Text,
  VStack,
  HStack,
  Flex,
  FormLabel,
  Stack,
} from '@chakra-ui/react';
import { Narrative, narrativesApi } from '../../api/narratives';
import { Fragment, fragmentsApi } from '../../api/fragments';
import { Person } from '../../api/persons';

export default function NarrativeEditor({
  narrative,
  onSave,
  fragments,
  persons,
}: {
  narrative: Narrative | null;
  onSave: () => void;
  fragments: Fragment[];
  persons: Person[];
}) {
  const [currentNarrative, setCurrentNarrative] = useState<Narrative | null>(narrative);
  const [descriptionLanguage, setDescriptionLanguage] = useState('EN');
  const [filteredFragments, setFilteredFragments] = useState<Fragment[]>(fragments);
  const [selectedPerson, setSelectedPerson] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (narrative) {
      setCurrentNarrative(narrative);
    } else {
      setCurrentNarrative({
        id: '',
        names: [{ name: '', languageCode: 'EN' }],
        descriptions: [{ languageCode: 'EN', description: [''] }],
        totalDurationSec: 0,
        fragmentsSequence: [],
      });
    }
  }, [narrative]);

  useEffect(() => {
    setFilteredFragments(fragments);
  }, [fragments]);

  const handlePersonChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const personId = e.target.value;
    setSelectedPerson(personId);
    const response = await fragmentsApi.getFragments({ personIds: [personId] });
    setFilteredFragments(response.data);
  };

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;

    const fragments = currentNarrative.fragmentsSequence
      .sort((a, b) => a.sequence - b.sequence)
      .map((f) => f.fragmentId);
    const [reorderedFragment] = fragments.splice(result.source.index, 1);
    fragments.splice(result.destination.index, 0, reorderedFragment);

    const newFragmentsSequence = fragments.map((fragmentId, idx) => ({
      fragmentId,
      sequence: idx + 1,
    }));

    setCurrentNarrative({
      ...currentNarrative,
      fragmentsSequence: newFragmentsSequence,
    });
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const updatedNames = currentNarrative.names.map((name) =>
      name.languageCode === descriptionLanguage ? { ...name, name: e.target.value } : name
    );

    if (!currentNarrative.names.some((name) => name.languageCode === descriptionLanguage)) {
      updatedNames.push({ languageCode: descriptionLanguage, name: e.target.value });
    }

    setCurrentNarrative({ ...currentNarrative, names: updatedNames });
  };

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const updatedDescriptions = currentNarrative.descriptions.map((desc) =>
      desc.languageCode === descriptionLanguage ? { ...desc, description: e.target.value.split('\n') } : desc
    );

    if (!currentNarrative.descriptions.some((desc) => desc.languageCode === descriptionLanguage)) {
      updatedDescriptions.push({
        languageCode: descriptionLanguage,
        description: e.target.value.split('\n'),
      });
    }

    setCurrentNarrative({ ...currentNarrative, descriptions: updatedDescriptions });
  };

  const handleSave = async () => {
    if (currentNarrative.id) {
      await narrativesApi.updateNarrative(currentNarrative.id, currentNarrative);
    } else {
      await narrativesApi.createNarrative(currentNarrative);
    }
    onSave();
  };

  return (
    <Card maxW="4xl" mx="auto" w="full">
      <CardBody p={6} position="relative">
        <Flex gap={4} alignItems="start">
          <VStack flex={1} spacing={6} align="stretch">
            <Select
              placeholder="Language"
              defaultValue="EN"
              onChange={(e) => {
                setDescriptionLanguage(e.target.value);
              }}
            >
              <option value="EN">English</option>
              <option value="ES">Spanish</option>
              <option value="FR">French</option>
              {/* Add more language options as needed */}
            </Select>
            <Box>
              <FormLabel fontSize="sm" fontWeight="medium">
                TITLE
              </FormLabel>
              <HStack mb={2}>
                <Textarea
                  value={currentNarrative.names.find((name) => name.languageCode === descriptionLanguage)?.name ?? ''}
                  onChange={handleNameChange}
                  placeholder="Name"
                />
              </HStack>
            </Box>

            <Box>
              <FormLabel fontSize="sm" fontWeight="medium">
                DESCRIPTION
              </FormLabel>
              <HStack align="start">
                <Textarea
                  value={
                    currentNarrative.descriptions
                      .find((desc) => desc.languageCode === descriptionLanguage)
                      ?.description.join('\n') ?? ''
                  }
                  onChange={handleDescriptionChange}
                  minH="200px"
                />
              </HStack>
            </Box>
          </VStack>

          <VStack flex={1} spacing={6} align="stretch">
            <Box>
              <Text fontSize="sm" fontWeight="medium" mb={2}>
                ADD FRAGMENT
              </Text>

              <Stack spacing={2}>
                <Select placeholder="CHOOSE PERSON FROM DROPDOWN" onChange={handlePersonChange}>
                  {persons.map((person) => (
                    <option key={person.id} value={person.id}>
                      {person.name}
                    </option>
                  ))}
                </Select>

                <Select placeholder="CHOOSE FRAGMENT FROM DROPDOWN">
                  {filteredFragments.map((fragment) => (
                    <option key={fragment.id} value={fragment.id}>
                      {fragment.attributes.title}
                    </option>
                  ))}
                </Select>
              </Stack>
            </Box>

            <Box>
              <Text fontSize="sm" fontWeight="medium" mb={2}>
                SEQUENCE
              </Text>
              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="fragmentsSequence">
                  {(provided) => (
                    <Box
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      borderWidth={1}
                      borderRadius="md"
                      bg="white"
                    >
                      {currentNarrative.fragmentsSequence
                        .sort((a, b) => a.sequence - b.sequence)
                        .map((fragment, index) => (
                          <Draggable key={fragment.fragmentId} draggableId={fragment.fragmentId} index={index}>
                            {(provided) => (
                              <Box
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                p={3}
                                borderBottomWidth={index === currentNarrative.fragmentsSequence.length - 1 ? 0 : 1}
                              >
                                FRAGMENT {fragment.sequence}: {fragment.fragmentId}
                              </Box>
                            )}
                          </Draggable>
                        ))}
                      {provided.placeholder}
                    </Box>
                  )}
                </Droppable>
              </DragDropContext>
            </Box>
          </VStack>
        </Flex>
        <Button onClick={handleSave}>Save</Button>
      </CardBody>
    </Card>
  );
}
