import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// Register the service worker for PWA installability and push notification
// support. Registration failure (e.g. running over plain http in some
// browsers) is non-fatal — the app works fine without it, just without
// offline app-shell caching or push notifications.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
