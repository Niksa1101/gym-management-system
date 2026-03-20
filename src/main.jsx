import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// ── Global input focus rescue ─────────────────────────────────────────────────
// Electron's webContents can silently lose keyboard focus after native dialogs
// (window.confirm, etc.) close. Inputs remain visually normal but stop
// accepting keystrokes. This capture-phase mousedown handler detects when a
// user clicks directly on a focusable field and explicitly calls .focus(),
// bypassing any stale Electron focus state.
document.addEventListener('mousedown', (e) => {
  const el = e.target;
  if (
    (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') &&
    !el.disabled &&
    !el.readOnly
  ) {
    // Let React's synthetic event settle first, then ensure focus is set.
    requestAnimationFrame(() => { if (document.activeElement !== el) el.focus(); });
  }
}, true); // capture phase — runs before any React handler

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
