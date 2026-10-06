import React from 'react';
import ReactDOM from 'react-dom/client';

console.log('[test.jsx] Starting minimal React test');

ReactDOM.createRoot(document.getElementById('root')).render(
  React.createElement('div', {
    style: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'linear-gradient(45deg, #d4af37, #f4e6a8)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'system-ui, sans-serif',
      color: '#0a0a0f',
      zIndex: 999999,
    }
  }, [
    React.createElement('h1', { key: 'title', style: { fontSize: '3rem', margin: '0 0 1rem' } }, '🟢 React is Working!'),
    React.createElement('p', { key: 'subtitle', style: { fontSize: '1.5rem', margin: 0 } }, 'If you see this, React mounts correctly'),
    React.createElement('p', { key: 'time', style: { fontSize: '1rem', marginTop: '1rem', opacity: 0.7 } }, `Loaded at ${new Date().toLocaleTimeString()}`),
  ])
);

console.log('[test.jsx] Render complete');