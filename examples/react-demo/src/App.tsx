import { Cart } from './components/Cart';
import { MockChainPanel } from '@mockchain/devtools';
import { getMockChainStore } from '@mockchain/core';

function App() {
  // Get the singleton store instance (same store used by MSW wrapper)
  const store = getMockChainStore();

  return (
    <div>
      <header
        style={{
          background: '#1a1a2e',
          color: '#fff',
          padding: '16px 20px',
          marginBottom: 20,
        }}
      >
        <div
          style={{
            maxWidth: 800,
            margin: '0 auto',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <h1 style={{ margin: 0, fontSize: 24 }}>MockChain Demo</h1>
          <span style={{ color: '#4ade80', fontSize: 14 }}>
            Time-Travel Debugging for API Mocks
          </span>
        </div>
      </header>

      <main>
        <Cart />
      </main>

      {/* MockChain DevTools Panel */}
      <MockChainPanel store={store} position="bottom-right" defaultCollapsed={false} />
    </div>
  );
}

export default App;
