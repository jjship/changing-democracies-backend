import { Tag } from '../../api/tags';
import { Box, Text, VStack, Button, Flex, HStack, Badge } from '@chakra-ui/react';

export function TagsList({
  onEdit,
  onDelete,
  tags,
}: {
  onEdit: (tag: Tag) => void;
  onDelete: (id: string) => void;
  tags: Tag[];
}) {
  return (
    <VStack spacing={4} align="stretch">
      {tags.map((tag) => {
        // First try to find English name
        const englishName = tag.names.find((name) => name.languageCode.toLowerCase() === 'en');
        // Fall back to first name or empty string
        const displayName = englishName?.name || tag.names[0]?.name || '';

        return (
          <Flex
            key={tag.id}
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
              {tag.names.length > 0 && (
                <HStack spacing={1} mb={2} flexWrap="wrap">
                  <Text fontSize="sm" color="gray.600">
                    Languages:
                  </Text>
                  {tag.names.map((name) => (
                    <Badge key={name.languageCode} colorScheme="blue" fontSize="xs">
                      {name.languageCode}
                    </Badge>
                  ))}
                </HStack>
              )}
              {tag.fragments && tag.fragments.length > 0 && (
                <Text fontSize="sm" color="gray.600">
                  Fragments: {tag.fragments.length}
                </Text>
              )}
            </Box>
            <Flex gap={4}>
              <Button colorScheme="teal" onClick={() => onEdit(tag)}>
                Edit
              </Button>
              <Button colorScheme="orange" onClick={() => onDelete(tag.id)}>
                Delete
              </Button>
            </Flex>
          </Flex>
        );
      })}
    </VStack>
  );
}
