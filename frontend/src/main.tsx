import React from 'react';
import ReactDOM from 'react-dom/client';
import { MutationCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import { initTheme } from './hooks/useTheme';
import { toast } from './hooks/toast';
import './index.css';

// Apply saved theme before first paint to prevent flash
initTheme();

const queryClient = new QueryClient({
  // Every failed save says so. Without this a rejected update was silent: the
  // screen simply kept the last value the server returned. Mutations that show
  // their own inline error opt out with meta.inlineErrors.
  mutationCache: new MutationCache({
    onError: (error, _vars, _ctx, mutation) => {
      if (mutation.meta?.inlineErrors) return;
      toast(`Couldn't save: ${error instanceof Error ? error.message : 'unknown error'}`, { tone: 'error' });
    },
  }),
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
