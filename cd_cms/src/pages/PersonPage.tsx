import { useState } from 'react';
import { PersonList } from '../components/persons/PersonList';
import { PersonForm } from '../components/persons/PersonForm';
import { Box } from '@chakra-ui/react';

export function PersonsPage() {
  const [refresh, setRefresh] = useState(false);

  const handleSave = () => {
    setRefresh(!refresh);
  };

  return (
    <Box>
      <PersonForm onSave={handleSave} />
      <PersonList key={refresh.toString()} />
    </Box>
  );
}
