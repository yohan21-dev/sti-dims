// src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import App from './App';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,   // 2 min
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#131B42',
              color: '#E2E8F0',
              border: '1px solid rgba(240,168,0,0.2)',
              borderRadius: '10px',
              fontFamily: '"DM Sans", sans-serif',
            },
            success: { iconTheme: { primary: '#F0A800', secondary: '#131B42' } },
          }}
        />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);