
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { TrackerProvider } from './lib/tracker';

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
        <TrackerProvider>
          <App />
        </TrackerProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
