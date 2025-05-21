import { useState, useEffect } from 'react';
import { tagCategoriesApi, TagCategory } from '../../api/tagCategories';
import { tagsApi, Tag } from '../../api/tags';
import { languagesApi, Language } from '../../api/languages';
import {
  Input,
  Button,
  Select,
  useToast,
  VStack,
  FormLabel,
  Flex,
  Checkbox,
  Box,
  Text,
  Spinner,
  Center,
} from '@chakra-ui/react';
import { useSaveColor } from '../../hooks/useSaveColor';
import { Name } from '../../api/commonTypes';

export function TagCategoryForm({
  tagCategory,
  onSave,
  onCancel,
}: {
  tagCategory: TagCategory | null;
  onSave: () => void;
  onCancel: () => void;
}) {
  const [names, setNames] = useState<Name[]>(tagCategory?.names || []);
  const [languageCode, setLanguageCode] = useState('');
  const [languages, setLanguages] = useState<Language[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [isLoadingTags, setIsLoadingTags] = useState(true);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(tagCategory?.tags?.map((t) => t.id) || []);
  const { saveColor, markUnsaved, markSaved } = useSaveColor();
  const toast = useToast();
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    loadLanguages();
    loadTags();
    if (tagCategory) {
      loadTagCategory();
    }
  }, [tagCategory]);

  const loadTagCategory = async () => {
    if (!tagCategory) return;
    try {
      if (tagCategory.names && tagCategory.names.length > 0) {
        setNames(tagCategory.names);
        setLanguageCode(tagCategory.names[0].languageCode);
      }
      if (tagCategory.tags) {
        setSelectedTagIds(tagCategory.tags.map((t) => t.id));
      }
    } catch (error) {
      toast({
        title: 'Error loading tag category',
        status: 'error',
        duration: 3000,
      });
    }
  };

  const loadLanguages = async () => {
    try {
      const langs = await languagesApi.getLanguages();
      setLanguages(langs);
      if (langs.length > 0 && !languageCode) {
        setLanguageCode(langs.find((lang) => lang.code === 'EN')?.code || langs[0].code);
      }
    } catch (error) {
      toast({
        title: 'Error loading languages',
        status: 'error',
        duration: 3000,
      });
    }
  };

  const loadTags = async () => {
    setIsLoadingTags(true);
    try {
      const allTags = await tagsApi.getTags();
      setTags(allTags);
    } catch (error) {
      toast({
        title: 'Error loading tags',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setIsLoadingTags(false);
    }
  };

  const handleSubmit = async () => {
    try {
      if (names.length === 0) {
        toast({
          title: 'At least one name is required',
          status: 'error',
          duration: 3000,
        });
        return;
      }

      await tagCategoriesApi.saveTagCategory(names, selectedTagIds, tagCategory?.id);

      toast({
        title: `Tag category ${tagCategory ? 'updated' : 'created'} successfully`,
        status: 'success',
        duration: 3000,
      });
      markSaved();
      onSave();

      // Reset form
      setNames([]);
      setSelectedTagIds([]);
      if (languages.length > 0) {
        setLanguageCode(languages[0].code);
      } else {
        setLanguageCode('');
      }
    } catch (error) {
      toast({
        title: `Error ${tagCategory ? 'updating' : 'creating'} tag category`,
        status: 'error',
        duration: 3000,
      });
      markUnsaved();
    }
  };

  const handleCancel = () => {
    setNames([]);
    setSelectedTagIds([]);
    if (languages.length > 0) {
      setLanguageCode(languages[0].code);
    } else {
      setLanguageCode('');
    }
    onCancel();
  };

  const setName = (newName: string) => {
    if (!languageCode) return;

    const existingNameIndex = names.findIndex((n) => n.languageCode === languageCode);

    if (existingNameIndex >= 0) {
      const updatedNames = [...names];
      updatedNames[existingNameIndex] = {
        languageCode: languageCode,
        name: newName,
      };
      setNames(updatedNames);
    } else {
      setNames([
        ...names,
        {
          languageCode: languageCode,
          name: newName,
        },
      ]);
    }
    markUnsaved();
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
  };

  const handleTagToggle = (tagId: string) => {
    const newSelectedTagIds = selectedTagIds.includes(tagId)
      ? selectedTagIds.filter((id) => id !== tagId)
      : [...selectedTagIds, tagId];
    setSelectedTagIds(newSelectedTagIds);
    markUnsaved();
  };

  return (
    <VStack spacing={4} align="stretch">
      <FormLabel>Language</FormLabel>
      <Select value={languageCode} onChange={(e) => setLanguageCode(e.target.value)}>
        {languages.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.name}
          </option>
        ))}
      </Select>

      <FormLabel>Name</FormLabel>
      <Input
        value={names.find((n) => n.languageCode === languageCode)?.name || ''}
        onChange={handleNameChange}
        placeholder="Name"
      />

      <FormLabel>Tags</FormLabel>
      <Box
        maxH="200px"
        overflowY="auto"
        sx={{
          '&::-webkit-scrollbar': {
            width: '8px',
          },
          '&::-webkit-scrollbar-track': {
            background: 'gray.100',
            borderRadius: '4px',
          },
          '&::-webkit-scrollbar-thumb': {
            background: 'gray.400',
            borderRadius: '4px',
            '&:hover': {
              background: 'gray.500',
            },
          },
        }}
        borderWidth={1}
        borderColor="gray.200"
        borderRadius="md"
        p={2}
      >
        {isLoadingTags ? (
          <Center h="100px">
            <Spinner size="lg" color="teal.500" />
          </Center>
        ) : (
          <Flex gap={2} flexWrap="wrap">
            {tags.map((tag) => {
              const tagName = tag.names.find((n) => n.languageCode === languageCode)?.name || tag.names[0]?.name;
              return (
                <Box
                  key={tag.id}
                  p={2}
                  borderWidth={1}
                  borderRadius="md"
                  bg={selectedTagIds.includes(tag.id) ? 'green.50' : 'white'}
                  _hover={{ bg: selectedTagIds.includes(tag.id) ? 'green.100' : 'gray.50' }}
                  cursor="pointer"
                  onClick={() => {
                    setSelectedTagIds((prev) =>
                      prev.includes(tag.id) ? prev.filter((id) => id !== tag.id) : [...prev, tag.id]
                    );
                    markUnsaved();
                  }}
                >
                  <Flex align="center" gap={2}>
                    <Checkbox
                      isChecked={selectedTagIds.includes(tag.id)}
                      onChange={(e) => {
                        e.stopPropagation();
                        setSelectedTagIds((prev) =>
                          prev.includes(tag.id) ? prev.filter((id) => id !== tag.id) : [...prev, tag.id]
                        );
                        markUnsaved();
                      }}
                    />
                    <Text>{tagName}</Text>
                  </Flex>
                </Box>
              );
            })}
          </Flex>
        )}
      </Box>

      <Flex gap={4}>
        <Button colorScheme="teal" onClick={handleCancel}>
          Cancel
        </Button>
        <Button colorScheme={saveColor} onClick={handleSubmit} mr={3}>
          {tagCategory ? 'Update' : 'Create'}
        </Button>
      </Flex>
    </VStack>
  );
}
