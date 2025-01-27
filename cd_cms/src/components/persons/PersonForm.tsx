import { useState } from 'react';
import { personsApi, CreatePersonRequest } from '../../api/persons';
import { Box, Input, Button } from '@chakra-ui/react';

export function PersonForm({ onSave }: { onSave: () => void }) {
  const [name, setName] = useState('');
  const [countryId, setCountryId] = useState('');

  const handleSubmit = async () => {
    const newPerson: CreatePersonRequest = { name, countryId };
    await personsApi.createPerson(newPerson);
    onSave();
  };

  return (
    <Box>
      <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
      <Input placeholder="Country ID" value={countryId} onChange={(e) => setCountryId(e.target.value)} />
      <Button onClick={handleSubmit}>Save</Button>
    </Box>
  );
}
