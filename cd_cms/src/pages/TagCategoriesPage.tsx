import { useEffect, useState } from 'react';
import { TagCategoryList } from '../components/tagCategories/TagCategoryList';
import { TagCategoryForm } from '../components/tagCategories/TagCategoryForm';
import { Box, Heading, Container, Button, useToast } from '@chakra-ui/react';
import { TagCategory } from '../api/tagCategories';
import { tagCategoriesApi } from '../api/tagCategories';

export function TagCategoriesPage() {
  const [tagCategories, setTagCategories] = useState<TagCategory[]>([]);
  const [refresh, setRefresh] = useState(false);
  const [selectedTagCategory, setSelectedTagCategory] = useState<TagCategory | undefined | null>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    loadTagCategories();
  }, [refresh]);

  const loadTagCategories = async () => {
    setIsLoading(true);
    try {
      const data = await tagCategoriesApi.getTagCategories();
      setTagCategories(data);
    } catch (error) {
      toast({
        title: 'Error loading tag categories, please try again',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = () => {
    setRefresh(!refresh);
    setSelectedTagCategory(undefined);
  };

  const handleEdit = (tagCategory: TagCategory) => {
    setSelectedTagCategory(tagCategory);
  };

  const handleDelete = async (id: string) => {
    try {
      await tagCategoriesApi.deleteTagCategory(id);
      toast({
        title: 'Tag category deleted successfully',
        status: 'success',
        duration: 3000,
      });
      setRefresh(!refresh);
    } catch (error) {
      toast({
        title: 'Error deleting tag category',
        status: 'error',
        duration: 3000,
      });
    }
  };

  const handleAdd = () => {
    setSelectedTagCategory(null);
  };

  const handleCancel = () => {
    setSelectedTagCategory(undefined);
  };

  return (
    <Container maxW="container.lg" py={8}>
      <Heading mb={6}>Edit Tag Categories</Heading>

      <Box>
        {selectedTagCategory === undefined && (
          <>
            <TagCategoryList
              onEdit={handleEdit}
              onDelete={handleDelete}
              tagCategories={tagCategories}
              isLoading={isLoading}
            />
            <Button colorScheme="green" w={'100%'} mt={6} mb={6} onClick={handleAdd}>
              Add New Tag Category
            </Button>
          </>
        )}
        {selectedTagCategory !== undefined && (
          <TagCategoryForm tagCategory={selectedTagCategory} onSave={handleSave} onCancel={handleCancel} />
        )}
      </Box>
    </Container>
  );
}
