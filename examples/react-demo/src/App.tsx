import { MockChainPanel } from '@mockchain/devtools';
import type { SetupWorker } from 'msw/browser';
import type { MockChainMethods } from '@mockchain/msw';
import { Cart } from './components/Cart';

interface AppProps {
  worker: SetupWorker & MockChainMethods;
}

function App({ worker }: AppProps) {
  return (
    <div className="app">
      <header className="app-header">
        <h1>
          <span className="logo">⛓️</span> MockChain Demo
        </h1>
        <p className="tagline">Time-travel debugging for API mocks</p>
      </header>

      <main className="app-main">
        <Cart />

        <section className="instructions">
          <h2>How to Use MockChain</h2>
          <ol>
            <li>
              <strong>Add items to cart</strong> - Each API request is automatically captured
            </li>
            <li>
              <strong>Create a checkpoint</strong> - Click the MockChain panel (bottom-right) and
              create a checkpoint
            </li>
            <li>
              <strong>Make more changes</strong> - Add or remove items
            </li>
            <li>
              <strong>Restore</strong> - Go back to your checkpoint and see the cart state restored!
            </li>
            <li>
              <strong>Branch</strong> - Create alternative timelines to explore different scenarios
            </li>
          </ol>
        </section>
      </main>

      <footer className="app-footer">
        <p>
          Built with <a href="https://mswjs.io/">MSW</a> +{' '}
          <a href="https://github.com/zach-fau/mockchain">MockChain</a>
        </p>
      </footer>

      {/* MockChain DevTools Panel */}
      <MockChainPanel store={worker.mockchain.getStore()} defaultCollapsed={false} />
    </div>
  );
}

export default App;
