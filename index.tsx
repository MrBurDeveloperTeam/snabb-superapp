
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
const isPetDesign = import.meta.env.DEV && ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname) && new URLSearchParams(window.location.search).get('pet-design') === '1';
const LocalPetDesign = React.lazy(() => import('./sharedPet/LocalPetDesign'));
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { TrackerProvider } from './lib/tracker';
import { useTheme } from './hooks/useTheme';
import './index.css';
import '@mrburdeveloperteam/pet-function/styles.css';

/** Keeps the global theme class on <html> in sync with the theme store. */
const ThemeBootstrap: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useTheme();
  return <>{children}</>;
};

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const queryClient = new QueryClient();
const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ThemeBootstrap>
          <TrackerProvider>
            {isPetDesign ? (
              <React.Suspense fallback={null}><LocalPetDesign /></React.Suspense>
            ) : <App />}
          </TrackerProvider>
        </ThemeBootstrap>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
