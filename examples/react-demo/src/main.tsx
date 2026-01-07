import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './App.css';

// Extend Window interface for debug access
declare global {
  interface Window {
    __mockchain_worker?: unknown;
  }
}

async function enableMocking() {
  const { worker } = await import('./mocks/browser');

  // Start the MSW worker
  await worker.start({
    onUnhandledRequest: 'bypass',
  });

  // Expose worker globally for debugging
  window.__mockchain_worker = worker;

  return worker;
}

// Initialize MSW before rendering the app
void enableMocking().then((worker) => {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    throw new Error('Root element not found');
  }
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App worker={worker} />
    </React.StrictMode>
  );
});
