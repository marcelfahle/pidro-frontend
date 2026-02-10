import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { App } from './App';
import { initRealtime } from './bootstrap/realtime';

// Initialize WebSocket connection early so channel hooks can use it immediately.
// Connects when an auth token is present, disconnects on sign-out.
initRealtime();

// biome-ignore lint/style/noNonNullAssertion: root element is guaranteed by index.html
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
