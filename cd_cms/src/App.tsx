import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ChakraProvider, Flex, Box } from '@chakra-ui/react';
import { Login } from './pages/Login';

import { supabase } from './lib/supabase';
import { TagsPage } from './pages/TagsPage';
import { PersonsPage } from './pages/PersonPage';
import { NarrativesPage } from './pages/NarrativesPage';
import ErrorBoundary from './components/ErrorBoundary';
import { NavigationPanel } from './components/NavigationPanel';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (isAuthenticated === null) {
    return null; // or loading spinner
  }

  return isAuthenticated ? (
    <>
      {' '}
      <NavigationPanel />
      {children}
    </>
  ) : (
    <Navigate to="/login" />
  );
}

export default function App() {
  return (
    <ChakraProvider>
      <Flex justifyContent="center" alignItems="flex-start" minHeight="100vh" minWidth="100vw" bg="gray.50">
        <Box width="100%" maxWidth="1200px" p={4}>
          <BrowserRouter>
            <ErrorBoundary>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/" element={<Navigate to="/narratives" replace />} />
                <Route
                  path="/tags"
                  element={
                    <ProtectedRoute>
                      <TagsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/persons"
                  element={
                    <ProtectedRoute>
                      <PersonsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/narratives"
                  element={
                    <ProtectedRoute>
                      <NarrativesPage />
                    </ProtectedRoute>
                  }
                />
              </Routes>
            </ErrorBoundary>
          </BrowserRouter>
        </Box>
      </Flex>
    </ChakraProvider>
  );
}
