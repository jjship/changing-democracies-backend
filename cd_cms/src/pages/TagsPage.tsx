import { useEffect, useState } from 'react';
import { TagsList } from '../components/tags/TagsList';
import { Box, Heading, Container, Button, useToast } from '@chakra-ui/react';
import { Tag } from '../api/tags';
import { tagsApi } from '../api/tags';
import TagEditor from '../components/tags/TagEditor';
import { Fragment, fragmentsApi } from '../api/fragments';
import { Person, personsApi } from '../api/persons';

export function TagsPage() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [fragments, setFragments] = useState<Fragment[]>([]);
  const [persons, setPersons] = useState<Person[]>([]);
  const [refresh, setRefresh] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | undefined | null>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    let ignore = false;
    const loadData = async () => {
      try {
        const tagsData = await tagsApi.getTags();
        if (!ignore) setTags(tagsData);

        const fragmentsResponse = await fragmentsApi.getFragments({});
        if (!ignore) setFragments(fragmentsResponse.data);

        const personsData = await personsApi.getPersons();
        if (!ignore) setPersons(personsData);
      } catch (_error) {
        if (ignore) return;
        toast({
          title: 'Error loading data, please try again',
          status: 'error',
          duration: 3000,
        });
      } finally {
        if (!ignore) setIsLoading(false);
      }
    };
    loadData();
    return () => {
      ignore = true;
    };
  }, [refresh, toast]);

  const handleSave = () => {
    setIsLoading(true);
    setRefresh(!refresh);
    setEditingTag(undefined);
  };

  const handleEdit = (tag: Tag) => {
    setEditingTag(tag);
  };

  const handleAdd = () => {
    setEditingTag(null);
  };

  const handleCancel = () => {
    setEditingTag(undefined);
  };

  const handleDelete = async (id: string) => {
    await tagsApi.deleteTag(id);
    setIsLoading(true);
    setRefresh(!refresh);
  };

  return (
    <Container maxW="container.lg" py={8}>
      <Heading mb={6}>Edit Tags</Heading>

      <Box>
        {editingTag === undefined && (
          <>
            <TagsList onEdit={handleEdit} onDelete={handleDelete} tags={tags} isLoading={isLoading} />
            <Button colorScheme="green" w={'100%'} mt={6} mb={6} onClick={handleAdd}>
              Add New Tag
            </Button>
          </>
        )}
        {editingTag !== undefined && (
          <TagEditor
            tag={editingTag}
            onSave={handleSave}
            onCancel={handleCancel}
            fragments={fragments}
            persons={persons}
          />
        )}
      </Box>
    </Container>
  );
}
