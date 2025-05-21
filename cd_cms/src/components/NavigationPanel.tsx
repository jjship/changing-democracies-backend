import { Box, Button, Flex, Spacer } from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export function NavigationPanel() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <Flex
      as="nav"
      p={4}
      bg="gray.100"
      alignItems="center"
      justifyContent="space-between"
      width="100%"
      maxWidth="1200px"
      mx="auto"
      borderRadius="md"
      shadow="md"
    >
      <Box fontSize="lg" fontWeight="bold">
        Changing Democracies Admin Panel
      </Box>
      <Spacer />
      <Flex gap={4}>
        <Button colorScheme="blue" variant="ghost" onClick={() => navigate('/narratives')} _hover={{ bg: 'blue.100' }}>
          Narratives
        </Button>
        <Button colorScheme="blue" variant="ghost" onClick={() => navigate('/persons')} _hover={{ bg: 'blue.100' }}>
          Persons
        </Button>
        <Button colorScheme="blue" variant="ghost" onClick={() => navigate('/tags')} _hover={{ bg: 'blue.100' }}>
          Tags
        </Button>
        <Button
          colorScheme="blue"
          variant="ghost"
          onClick={() => navigate('/tag-categories')}
          _hover={{ bg: 'blue.100' }}
        >
          Tag Categories
        </Button>
        <Button colorScheme="red" variant="solid" onClick={handleLogout} _hover={{ bg: 'red.600' }}>
          Logout
        </Button>
      </Flex>
    </Flex>
  );
}
