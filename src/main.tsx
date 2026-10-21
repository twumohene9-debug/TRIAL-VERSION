import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import 'katex/dist/katex.min.css';
import './utils/safeStorage';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';

// Register Service Worker for PWA support
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.log('Service Worker registration skipped or failed:', err);
    });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary fallbackTitle="Portal Initialization Error">
      <App />
    </ErrorBoundary>
  </StrictMode>,
);

