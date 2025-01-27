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
    <Flex as="nav" p={4} bg="gray.100" alignItems="center">
      <Box>Changing Democracies Admin Panel</Box>
      <Spacer />
      <Button colorScheme="red" onClick={handleLogout}>
        Logout
      </Button>
    </Flex>
  );
}
