import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/open-sans/700.css';
import '@fontsource/archivo/400.css';
import '@fontsource/archivo/700.css';
import './index.css';
import { App } from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
