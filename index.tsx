import React from 'react';
import { createRoot } from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import * as Sentry from '@sentry/react';
import './src/index.css';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN || "https://c7ddb8f7282583fc425aaf6b2fd91b5f@o4511951484616704.ingest.us.sentry.io/4511951502311424";

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: false,
        blockAllMedia: false,
      }),
    ],
    // Rastreamento de performance
    tracesSampleRate: 0.2,
    // Gravação de sessão (Session Replay)
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0, // 100% de gravação visual quando houver erro
    environment: import.meta.env.MODE || 'production',
  });
}

const container = document.getElementById('root');

if (!container) {
  throw new Error("Failed to find the root element");
}

const root = createRoot(container);

root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <HelmetProvider>
        <App />
      </HelmetProvider>
    </ErrorBoundary>
  </React.StrictMode>
);


