import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ChakraProvider } from '@chakra-ui/react';
import { Login } from './pages/Login';

import { supabase } from './lib/supabase';
import { TagsPage } from './pages/TagsPage';
import { PersonsPage } from './pages/PersonPage';
import { NarrativesPage } from './pages/NarrativesPage';

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

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
}

function Dashboard() {
  return <div>Dashboard (Protected Route)</div>;
}

export default function App() {
  return (
    <ChakraProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
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
      </BrowserRouter>
    </ChakraProvider>
  );
}
