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
  IconButton,
} from '@chakra-ui/react';
import { Narrative, narrativesApi } from '../../api/narratives';
import { Fragment, fragmentsApi } from '../../api/fragments';
import { Person } from '../../api/persons';
import { CloseIcon } from '@chakra-ui/icons';
import { Language, languagesApi } from '../../api/languages';

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
  const [descriptionLanguage, setDescriptionLanguage] = useState<Language | null>(null);
  const [filteredFragments, setFilteredFragments] = useState<Fragment[]>(fragments);
  const [selectedPerson, setSelectedPerson] = useState<string | null>(null);
  const [languages, setLanguages] = useState<Language[]>([]);
  const [saveColor, setSaveColor] = useState<
    | 'whiteAlpha'
    | 'blackAlpha'
    | 'gray'
    | 'red'
    | 'orange'
    | 'yellow'
    | 'green'
    | 'teal'
    | 'blue'
    | 'cyan'
    | 'purple'
    | 'pink'
  >('whiteAlpha');

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

  useEffect(() => {
    const fetchLanguages = async () => {
      const fetchedLanguages = await languagesApi.getLanguages();
      setLanguages(fetchedLanguages);
      setDescriptionLanguage(fetchedLanguages.find((lg) => lg.code === 'EN') ?? null);
    };

    fetchLanguages();
  }, []);

  const handlePersonChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const personId = e.target.value;
    setSelectedPerson(personId);
    const response = await fragmentsApi.getFragments({ personIds: [personId] });
    setFilteredFragments(response.data);
  };

  const handleFragmentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (!currentNarrative) return;

    const fragmentId = e.target.value;
    const newFragment = filteredFragments.find((fragment) => fragment.id === fragmentId);
    if (newFragment) {
      const newFragmentsSequence = [
        ...currentNarrative.fragmentsSequence,
        { fragmentId: newFragment.id, sequence: currentNarrative.fragmentsSequence.length + 1 },
      ];
      setCurrentNarrative({
        ...currentNarrative,
        fragmentsSequence: newFragmentsSequence,
      });
    }

    setSaveColor('orange');
  };

  const handleDragEnd = (result: any) => {
    if (!result.destination || !currentNarrative) return;

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

    setSaveColor('orange');
  };

  const handleRemoveFragment = (fragmentId: string) => {
    if (!currentNarrative) return;

    const newFragmentsSequence = currentNarrative.fragmentsSequence
      .filter((fragment) => fragment.fragmentId !== fragmentId)
      .map((fragment, index) => ({ ...fragment, sequence: index + 1 }));
    setCurrentNarrative({
      ...currentNarrative,
      fragmentsSequence: newFragmentsSequence,
    });

    setSaveColor('orange');
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (!currentNarrative || !descriptionLanguage) return;

    const updatedNames = currentNarrative.names.map((name) =>
      name.languageCode === descriptionLanguage?.code ? { ...name, name: e.target.value } : name
    );

    if (!currentNarrative.names.some((name) => name.languageCode === descriptionLanguage.code)) {
      updatedNames.push({ languageCode: descriptionLanguage?.code, name: e.target.value });
    }

    setSaveColor('orange');

    setCurrentNarrative({ ...currentNarrative, names: updatedNames });
  };

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (!currentNarrative || !descriptionLanguage) return;

    const updatedDescriptions = currentNarrative.descriptions.map((desc) =>
      desc.languageCode === descriptionLanguage.code ? { ...desc, description: e.target.value.split('\n') } : desc
    );

    if (!currentNarrative.descriptions.some((desc) => desc.languageCode === descriptionLanguage.code)) {
      updatedDescriptions.push({
        languageCode: descriptionLanguage.code,
        description: e.target.value.split('\n'),
      });
    }

    setSaveColor('orange');

    setCurrentNarrative({ ...currentNarrative, descriptions: updatedDescriptions });
  };

  const handleSave = async () => {
    if (!currentNarrative) return;

    if (currentNarrative.id) {
      await narrativesApi.updateNarrative(currentNarrative.id, currentNarrative);
    } else {
      await narrativesApi.createNarrative(currentNarrative);
    }

    setSaveColor('whiteAlpha');
    onSave();
  };

  return (
    currentNarrative && (
      <Card maxW="4xl" mx="auto" w="full">
        <CardBody p={6} position="relative">
          <Flex gap={4} alignItems="start">
            <VStack flex={1} spacing={6} align="stretch">
              <Select
                placeholder="Language"
                onChange={(e) => {
                  const targetLanguge = languages.find((lg) => lg.code === e.target.value) ?? null;
                  setDescriptionLanguage(targetLanguge);
                }}
              >
                {languages.map((language) => (
                  <option key={language.code} value={language.code}>
                    {language.name}
                  </option>
                ))}
              </Select>
              <Box>
                <FormLabel fontSize="sm" fontWeight="medium">
                  TITLE
                </FormLabel>
                <HStack mb={2}>
                  <Textarea
                    value={
                      currentNarrative.names.find((name) => name.languageCode === descriptionLanguage?.code)?.name ?? ''
                    }
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
                        .find((desc) => desc.languageCode === descriptionLanguage?.code)
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

                  <Select placeholder="CHOOSE FRAGMENT FROM DROPDOWN" onChange={handleFragmentChange}>
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
                                <Flex>
                                  <IconButton
                                    aria-label="Remove fragment"
                                    icon={<CloseIcon />}
                                    colorScheme="yellow"
                                    size="xs"
                                    onClick={() => handleRemoveFragment(fragment.fragmentId)}
                                  />
                                  <Box
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    p={3}
                                    borderBottomWidth={index === currentNarrative.fragmentsSequence.length - 1 ? 0 : 1}
                                  >
                                    {fragment.sequence}:{' '}
                                    {fragments?.find((fr) => fr.id === fragment.fragmentId)?.attributes.title ?? ''}
                                  </Box>
                                </Flex>
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
          <Flex gap={4}>
            <Button aria-label="Cancel editing" onClick={handleSave} colorScheme={'teal'}>
              Cancel
            </Button>
            <Button aria-label="Save edited narrative" onClick={handleSave} colorScheme={saveColor}>
              Save
            </Button>
          </Flex>
        </CardBody>
      </Card>
    )
  );
}
