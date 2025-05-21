import { TagCategory } from '../../api/tagCategories';
import { Box, Text, VStack, Button, Flex, HStack, Badge, Spinner, Center } from '@chakra-ui/react';

export function TagCategoryList({
  onEdit,
  onDelete,
  tagCategories,
  isLoading,
}: {
  onEdit: (tagCategory: TagCategory) => void;
  onDelete: (id: string) => void;
  tagCategories: TagCategory[];
  isLoading?: boolean;
}) {
  if (isLoading) {
    return (
      <Center h="200px">
        <Spinner size="lg" color="teal.500" />
      </Center>
    );
  }

  return (
    <VStack spacing={4} align="stretch">
      {tagCategories.map((tagCategory) => {
        // First try to find English name
        const englishName = tagCategory.names.find((name) => name.languageCode.toLowerCase() === 'en');
        // Fall back to first name or empty string
        const displayName = englishName?.name || tagCategory.names[0]?.name || '';

        return (
          <Flex
            key={tagCategory.id}
            gap={4}
            p={4}
            borderWidth={1}
            borderRadius="md"
            shadow="sm"
            justify="space-between"
            align="center"
            _hover={{ bg: 'gray.50' }}
          >
            <Box>
              <Text fontSize="lg" fontWeight="bold" mb={2}>
                {displayName}
              </Text>
              {tagCategory.names.length > 0 && (
                <HStack spacing={1} mb={2} flexWrap="wrap">
                  <Text fontSize="sm" color="gray.600">
                    Languages:
                  </Text>
                  {tagCategory.names.map((name) => (
                    <Badge key={name.languageCode} colorScheme="blue" fontSize="xs">
                      {name.languageCode}
                    </Badge>
                  ))}
                </HStack>
              )}
              {tagCategory.tags && tagCategory.tags.length > 0 && (
                <Flex gap={2} flexWrap="wrap">
                  {tagCategory.tags.map((tag) => {
                    const tagEnglishName = tag.names.find((n) => n.languageCode.toLowerCase() === 'en');
                    const tagDisplayName = tagEnglishName?.name || tag.names[0]?.name || '';
                    return (
                      <Badge key={tag.id} colorScheme="teal">
                        {tagDisplayName}
                      </Badge>
                    );
                  })}
                </Flex>
              )}
            </Box>
            <Flex gap={4}>
              <Button colorScheme="teal" onClick={() => onEdit(tagCategory)}>
                Edit
              </Button>
              <Button colorScheme="orange" onClick={() => onDelete(tagCategory.id)}>
                Delete
              </Button>
            </Flex>
          </Flex>
        );
      })}
    </VStack>
  );
}
