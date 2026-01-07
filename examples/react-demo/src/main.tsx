import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

async function enableMocking() {
  // Only enable in development
  if (import.meta.env.PROD) {
    return;
  }

  const { worker } = await import('./mocks/browser');

  // Start the MSW worker with MockChain integration
  return worker.start({
    onUnhandledRequest: 'bypass',
    quiet: true,
  });
}

// Enable mocking before rendering
void enableMocking().then(() => {
  const root = document.getElementById('root');
  if (root) {
    createRoot(root).render(
      <StrictMode>
        <App />
      </StrictMode>
    );
  }
});
