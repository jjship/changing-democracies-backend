import { useEffect, useState } from 'react';
import { personsApi, Person } from '../../api/persons';
import { Box, Text, Button } from '@chakra-ui/react';

export function PersonList() {
  const [persons, setPersons] = useState<Person[]>([]);

  useEffect(() => {
    personsApi.getPersons().then(setPersons);
  }, []);

  return (
    <Box>
      {persons.map((person) => (
        <Box key={person.id} p={4} borderWidth={1} borderRadius="md">
          <Text>{person.name}</Text>
        </Box>
      ))}
      <Button onClick={() => console.log('Add Person')}>Add Person</Button>
    </Box>
  );
}
