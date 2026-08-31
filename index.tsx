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

    // 🛡️ Filtro de Ruídos: Ignorar erros conhecidos de WebViews do Android (Instagram/Facebook/TikTok) e extensões
    ignoreErrors: [
      'Error invoking postMessage: Java object is gone',
      'Error invoking postMessage: Java exception was raised during method invocation',
      'Java object is gone',
      'Java exception was raised during method invocation',
      'ResizeObserver loop limit exceeded',
      'ResizeObserver loop completed with undelivered notifications',
      'Non-Error promise rejection captured',
      'Network request failed',
    ],
    denyUrls: [
      // Extensões de navegadores
      /extensions\//i,
      /^chrome:\/\//i,
      /^chrome-extension:\/\//i,
      /^moz-extension:\/\//i,
    ],
    beforeSend(event, hint) {
      const errorMsg = hint?.originalException?.toString?.() || event?.message || '';
      if (
        /postMessage/i.test(errorMsg) &&
        (/Java object is gone/i.test(errorMsg) || /Java exception/i.test(errorMsg))
      ) {
        return null; // Descarta o evento silenciosamente
      }
      return event;
    },
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


