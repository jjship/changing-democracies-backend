import { useEffect, useState } from 'react';
import { PersonList } from '../components/persons/PersonList';
import { PersonForm } from '../components/persons/PersonForm';
import { Box, Heading, Container, Button, useToast } from '@chakra-ui/react';
import { Person } from '../api/persons';
import { personsApi } from '../api/persons';
export function PersonsPage() {
  const [persons, setPersons] = useState<Person[]>([]);
  const [refresh, setRefresh] = useState(false);
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);
  const toast = useToast();

  useEffect(() => {
    loadPersons();
  }, [refresh]);

  const loadPersons = async () => {
    try {
      const data = await personsApi.getPersons();
      setPersons(data);
    } catch (error) {
      toast({
        title: 'Error loading persons, please try again',
        status: 'error',
        duration: 3000,
      });
    }
  };

  const handleSave = () => {
    setRefresh(!refresh);
    setEditingPerson(null);
  };

  const handleEdit = (person: Person) => {
    setEditingPerson(person);
  };

  const handleAdd = () => {
    setEditingPerson(null);
  };

  return (
    <Container maxW="container.lg" py={8}>
      <Heading mb={6}>Edit Persons</Heading>

      <Box>
        {!editingPerson && (
          <>
            <PersonList onEdit={handleEdit} persons={persons} />
            <Button colorScheme="green" w={'100%'} mt={6} mb={6} onClick={handleAdd}>
              Add New Person
            </Button>
          </>
        )}
        {editingPerson && <PersonForm person={editingPerson} onSave={handleSave} />}
      </Box>
    </Container>
  );
}
