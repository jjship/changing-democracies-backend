import { Person } from '../../api/persons';
import { Box, Text, VStack, Button, Flex } from '@chakra-ui/react';

export function PersonList({ onEdit, persons }: { onEdit: (person: Person) => void; persons: Person[] }) {
  return (
    <VStack spacing={4} align="stretch">
      {persons.map((person) => (
        <Flex
          key={person.id}
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
              {person.name ?? ''}
            </Text>
            {person.countryCode && (
              <Text fontSize="sm" color="gray.600">
                Country: {person.countryCode}
              </Text>
            )}
          </Box>
          <Button colorScheme="teal" onClick={() => onEdit(person)}>
            Edit
          </Button>
        </Flex>
      ))}
    </VStack>
  );
}
