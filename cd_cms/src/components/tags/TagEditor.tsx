import { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardBody,
  Button,
  Select,
  Input,
  Text,
  VStack,
  Flex,
  FormLabel,
  Stack,
  IconButton,
  List,
  ListItem,
} from '@chakra-ui/react';
import { Tag, tagsApi } from '../../api/tags';
import { Fragment, fragmentsApi } from '../../api/fragments';
import { Person } from '../../api/persons';
import { CloseIcon } from '@chakra-ui/icons';
import { Language, languagesApi } from '../../api/languages';
import { useSaveColor } from '../../hooks/useSaveColor';

export default function TagEditor({
  tag,
  onSave,
  onCancel,
  fragments,
  persons,
}: {
  tag: Tag | null;
  onSave: () => void;
  onCancel: () => void;
  fragments: Fragment[];
  persons: Person[];
}) {
  const { saveColor, markUnsaved, markSaved } = useSaveColor();
  const [currentTag, setCurrentTag] = useState<Tag | null>(tag);
  const [nameLanguage, setNameLanguage] = useState<Language | null>(null);
  const [selectedPersonId, setSelectedPersonId] = useState<string>('');
  const [personFragments, setPersonFragments] = useState<Fragment[]>([]);
  const [tagFragments, setTagFragments] = useState<Fragment[]>([]);
  const [languages, setLanguages] = useState<Language[]>([]);

  useEffect(() => {
    if (tag) {
      setCurrentTag(tag);

      // Initialize tagFragments from tag's fragments data
      if (tag.fragments && fragments.length > 0) {
        const taggedFragments = fragments.filter((fragment) =>
          tag.fragments.some((tagFragment) => tagFragment.id === fragment.id)
        );
        setTagFragments(taggedFragments);
      } else {
        setTagFragments([]);
      }
    } else {
      setCurrentTag({
        id: '',
        names: [{ languageCode: 'EN', name: '' }],
        fragments: [],
      });
      setTagFragments([]);
    }
  }, [tag, fragments]);

  useEffect(() => {
    const fetchLanguages = async () => {
      const fetchedLanguages = await languagesApi.getLanguages();
      setLanguages(fetchedLanguages);
      setNameLanguage(fetchedLanguages.find((lg) => lg.code === 'EN') ?? null);
    };

    fetchLanguages();
  }, []);

  const handlePersonChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const personId = e.target.value;
    setSelectedPersonId(personId);

    if (personId) {
      const response = await fragmentsApi.getFragments({ personIds: [personId] });
      setPersonFragments(response.data);
    } else {
      setPersonFragments([]);
    }
  };

  const handleAddFragment = (fragmentId: string) => {
    const fragmentToAdd = fragments.find((f) => f.id === fragmentId);
    if (fragmentToAdd && !tagFragments.some((f) => f.id === fragmentId)) {
      setTagFragments([...tagFragments, fragmentToAdd]);
      markUnsaved();
    }
  };

  const handleAddAllFragments = () => {
    if (personFragments.length === 0) return;

    const newTagFragments = [...tagFragments];
    let changed = false;

    personFragments.forEach((fragment) => {
      if (!newTagFragments.some((f) => f.id === fragment.id)) {
        newTagFragments.push(fragment);
        changed = true;
      }
    });

    if (changed) {
      setTagFragments(newTagFragments);
      markUnsaved();
    }
  };

  const handleRemoveFragment = (fragmentId: string) => {
    setTagFragments(tagFragments.filter((fragment) => fragment.id !== fragmentId));
    markUnsaved();
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!currentTag || !nameLanguage) return;

    const updatedNames = [...currentTag.names];
    const existingNameIndex = updatedNames.findIndex((name) => name.languageCode === nameLanguage.code);

    if (existingNameIndex >= 0) {
      updatedNames[existingNameIndex] = {
        ...updatedNames[existingNameIndex],
        name: e.target.value,
      };
    } else {
      updatedNames.push({
        languageCode: nameLanguage.code,
        name: e.target.value,
      });
    }

    setCurrentTag({ ...currentTag, names: updatedNames });
    markUnsaved();
  };

  const handleSave = async () => {
    if (!currentTag) return;

    try {
      // Get the fragment IDs for sending to the API
      const fragmentIds = tagFragments.map((fragment) => fragment.id);

      // Update or create the tag
      let savedTag: Tag;
      if (currentTag.id) {
        savedTag = await tagsApi.updateTag(currentTag.id, currentTag.names, fragmentIds);
      } else {
        savedTag = await tagsApi.createTag(currentTag.names);
        // If we have fragments to associate and this is a new tag, we need to update it again
        if (fragmentIds.length > 0) {
          savedTag = await tagsApi.updateTag(savedTag.id, savedTag.names, fragmentIds);
        }
      }

      markSaved();
      onSave();
    } catch (error) {
      console.error('Error saving tag:', error);
    }
  };

  const getCurrentTagName = (): string => {
    if (!currentTag || !nameLanguage) return '';

    const name = currentTag.names.find((name) => name.languageCode === nameLanguage.code);

    return name?.name || '';
  };

  return (
    currentTag && (
      <Card maxW="4xl" mx="auto" w="full">
        <CardBody p={6} position="relative">
          <Flex gap={4} alignItems="start">
            {/* Left Side: Language selection and tag name input */}
            <VStack flex={1} spacing={6} align="stretch">
              <Select
                placeholder="Language"
                value={nameLanguage?.code ?? ''}
                onChange={(e) => {
                  const targetLanguage = languages.find((lg) => lg.code === e.target.value) ?? null;
                  setNameLanguage(targetLanguage);
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
                  TAG NAME
                </FormLabel>
                <Input value={getCurrentTagName()} onChange={handleNameChange} placeholder="Tag name" />
              </Box>
            </VStack>

            {/* Middle: Person selection and fragments list */}
            <VStack flex={1} spacing={6} align="stretch">
              <Box>
                <Text fontSize="sm" fontWeight="medium" mb={2}>
                  SELECT PERSON AND FRAGMENTS
                </Text>

                <Stack spacing={2}>
                  <Select
                    placeholder="CHOOSE PERSON FROM DROPDOWN"
                    onChange={handlePersonChange}
                    value={selectedPersonId}
                  >
                    {persons.map((person) => (
                      <option key={person.id} value={person.id}>
                        {person.name}
                      </option>
                    ))}
                  </Select>

                  {selectedPersonId && (
                    <Button
                      colorScheme="blue"
                      onClick={handleAddAllFragments}
                      isDisabled={personFragments.length === 0}
                    >
                      Add All Fragments
                    </Button>
                  )}

                  {personFragments.length > 0 && (
                    <Box borderWidth={1} borderRadius="md" p={2} maxH="300px" overflowY="auto">
                      <List spacing={1}>
                        {personFragments.map((fragment) => (
                          <ListItem
                            key={fragment.id}
                            p={2}
                            _hover={{ bg: 'gray.100' }}
                            cursor="pointer"
                            onClick={() => handleAddFragment(fragment.id)}
                            display="flex"
                            justifyContent="space-between"
                            alignItems="center"
                          >
                            <Text>{fragment.attributes.title}</Text>
                            {tagFragments.some((f) => f.id === fragment.id) && (
                              <Text fontSize="sm" color="green.500">
                                Added
                              </Text>
                            )}
                          </ListItem>
                        ))}
                      </List>
                    </Box>
                  )}
                </Stack>
              </Box>
            </VStack>

            {/* Right Side: Tagged fragments list */}
            <VStack flex={1} spacing={6} align="stretch">
              <Box>
                <Text fontSize="sm" fontWeight="medium" mb={2}>
                  TAG FRAGMENTS ({tagFragments.length})
                </Text>
                <Box borderWidth={1} borderRadius="md" p={2} maxH="400px" overflowY="auto">
                  {tagFragments.length === 0 ? (
                    <Text p={4} color="gray.500">
                      No fragments added to this tag
                    </Text>
                  ) : (
                    <List spacing={1}>
                      {tagFragments.map((fragment) => (
                        <ListItem
                          key={fragment.id}
                          p={2}
                          borderBottomWidth={1}
                          borderBottomColor="gray.200"
                          display="flex"
                          justifyContent="space-between"
                          alignItems="center"
                        >
                          <Text>{fragment.attributes.title}</Text>
                          <IconButton
                            aria-label="Remove fragment"
                            icon={<CloseIcon />}
                            size="xs"
                            colorScheme="red"
                            onClick={() => handleRemoveFragment(fragment.id)}
                          />
                        </ListItem>
                      ))}
                    </List>
                  )}
                </Box>
              </Box>
            </VStack>
          </Flex>
          <Flex gap={4} mt={6}>
            <Button aria-label="Cancel editing" onClick={onCancel} colorScheme={'teal'}>
              Cancel
            </Button>
            <Button aria-label="Save edited tag" onClick={handleSave} colorScheme={saveColor}>
              Save
            </Button>
          </Flex>
        </CardBody>
      </Card>
    )
  );
}
