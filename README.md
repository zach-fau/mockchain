# MockChain

> Git for your mock API state - Time-travel debugging for API mocks

[![npm version](https://img.shields.io/npm/v/@mockchain/core.svg)](https://www.npmjs.com/package/@mockchain/core)
[![Build Status](https://img.shields.io/github/actions/workflow/status/zach-fau/mockchain/ci.yml?branch=main)](https://github.com/zach-fau/mockchain/actions)
[![Coverage](https://img.shields.io/codecov/c/github/zach-fau/mockchain)](https://codecov.io/gh/zach-fau/mockchain)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)

---

## The Problem

Frontend developers waste hours clicking through complex UI flows to recreate specific application states when testing API integrations. Current mocking solutions like MSW (Mock Service Worker) handle basic request/response mocking beautifully, but they're fundamentally **stateless**.

Every time you want to test a different scenario, you either:

- **Click through the entire flow again** to reach the state you need
- **Write complex conditional logic** in mock handlers to simulate state changes
- **Maintain separate mock configurations** for each test scenario

This becomes exponentially worse when testing edge cases:

- "What happens if the payment fails after the user adds 3 items to cart?"
- "How does the UI behave when the auth token expires mid-checkout?"
- "What if the API returns a different response for the same endpoint later in the session?"

**The real pain**: Developers spend 60%+ of their testing time _getting to the state they want to test_, not actually testing.

## The Solution

MockChain extends MSW with a **state layer** that captures, checkpoints, and restores your mock API state - like Git for your mocks:

- **Checkpoints** - Save snapshots of your mock state at any point
- **Time-Travel** - Instantly restore to any previous checkpoint
- **Branching Timelines** - Create parallel branches to test different scenarios
- **DevTools Panel** - Visual interface to manage checkpoints and timelines
- **MSW Integration** - Works with your existing handlers (not a replacement)
- **TypeScript First** - Full type safety and excellent DX

---

## Demo

<!-- GIF demos will be added here - showing checkpoint/restore workflow -->

![Checkpoint Demo](docs/assets/checkpoint-demo.gif)
_Create checkpoints at key states, then instantly restore to test different paths_

<!-- GIF demo showing branching timelines -->

![Branching Demo](docs/assets/branching-demo.gif)
_Branch from any checkpoint to explore multiple scenarios without losing progress_

---

## Quick Start

### Installation

```bash
npm install @mockchain/core @mockchain/msw-adapter

# Optional: DevTools panel for React apps
npm install @mockchain/devtools
```

### Basic Usage

**1. Wrap your MSW worker:**

```typescript
// src/mocks/browser.ts
import { setupWorker } from 'msw/browser';
import { withMockChain } from '@mockchain/msw-adapter';
import { handlers } from './handlers';

export const worker = withMockChain(setupWorker(...handlers));
```

**2. Start the worker in your app:**

```typescript
// src/main.tsx
import { worker } from './mocks/browser';

async function enableMocking() {
  if (process.env.NODE_ENV === 'development') {
    await worker.start();
  }
}

enableMocking().then(() => {
  // Your app initialization
});
```

**3. Create checkpoints and restore:**

```typescript
// In your browser console or test code
const { mockchain } = worker;

// Use your app normally - MockChain captures request/response pairs automatically

// Save a checkpoint at any interesting state
const checkpoint = mockchain.checkpoint('user-logged-in');

// Continue using your app...
mockchain.checkpoint('cart-with-3-items');
mockchain.checkpoint('ready-for-checkout');

// Jump back to any checkpoint instantly
mockchain.restore(checkpoint.id);

// Or restore by finding the checkpoint
const store = mockchain.getStore();
const checkpoints = store.listCheckpoints();
const cartCheckpoint = checkpoints.find((cp) => cp.name === 'cart-with-3-items');
if (cartCheckpoint) {
  mockchain.restore(cartCheckpoint.id);
}
```

### With DevTools

```tsx
// src/App.tsx
import { MockChainPanel } from '@mockchain/devtools';
import { worker } from './mocks/browser';

function App() {
  return (
    <>
      {/* Your app content */}
      <YourAppContent />

      {/* Add DevTools panel in development */}
      {process.env.NODE_ENV === 'development' && (
        <MockChainPanel store={worker.mockchain.getStore()} />
      )}
    </>
  );
}
```

---

## API Reference

### MSW Wrapper

#### `withMockChain(worker, options?)`

Wraps an MSW `SetupWorker` with MockChain functionality.

```typescript
import { setupWorker } from 'msw/browser';
import { withMockChain } from '@mockchain/msw-adapter';

const worker = withMockChain(setupWorker(...handlers), {
  autoCapture: true, // Automatically capture all requests (default: true)
  exclude: [
    // Patterns to exclude from capture
    '/health',
    /\.hot-update\./,
  ],
});
```

### MockChain Methods (via `worker.mockchain`)

| Method                            | Description                            | Returns          |
| --------------------------------- | -------------------------------------- | ---------------- |
| `checkpoint(name, description?)`  | Create a checkpoint with current state | `Checkpoint`     |
| `restore(checkpointId)`           | Restore mock state to a checkpoint     | `void`           |
| `branch(name, fromCheckpointId?)` | Create a new timeline branch           | `Timeline`       |
| `switchTimeline(timelineId)`      | Switch to a different timeline         | `void`           |
| `getStore()`                      | Get the underlying MockChain store     | `MockChainStore` |

### Core Store Methods

For advanced usage, access the store directly:

```typescript
import { getMockChainStore } from '@mockchain/core';

const store = getMockChainStore();
```

#### Checkpoint Management

```typescript
// Create a checkpoint
const checkpoint = store.createCheckpoint({
  name: 'after-login',
  description: 'User authenticated with test credentials', // optional
});

// Restore to a checkpoint
store.restoreCheckpoint(checkpoint.id);

// List all checkpoints
const allCheckpoints = store.listCheckpoints();

// List checkpoints for specific timeline
const timelineCheckpoints = store.listCheckpoints('timeline-id');

// Get a specific checkpoint
const cp = store.getCheckpoint('checkpoint-id');

// Delete a checkpoint
store.deleteCheckpoint('checkpoint-id');
```

#### Timeline/Branch Management

```typescript
// Create a branch from current state
const branch = store.createBranch({ name: 'payment-failure' });

// Create a branch from a specific checkpoint
const branch2 = store.createBranch({
  name: 'session-expired',
  fromCheckpointId: 'checkpoint-id',
});

// Switch between timelines
store.switchTimeline('timeline-id');

// Get current timeline
const current = store.getCurrentTimeline();

// List all timelines
const timelines = store.listTimelines();

// Delete a timeline (and its checkpoints)
store.deleteTimeline('timeline-id');
```

#### State Queries

```typescript
// Get all captured request/response pairs
const captures = store.getCaptures();

// Find a specific capture by method and URL
const userCapture = store.findCapture('GET', '/api/users');

// Clear current captures
store.clearCaptures();
```

### Configuration Options

```typescript
interface WithMockChainOptions {
  // Whether to automatically capture all requests (default: true)
  autoCapture?: boolean;

  // Request patterns to exclude from capture
  // Useful for excluding health checks, hot module reload, etc.
  exclude?: (string | RegExp)[];
}
```

---

## Comparison

| Feature              |  MSW   | Mirage.js |   MockChain   |
| -------------------- | :----: | :-------: | :-----------: |
| Request interception |  Yes   |    Yes    |      Yes      |
| Response mocking     |  Yes   |    Yes    |      Yes      |
| Stateful responses   | Manual |  Partial  | **Automatic** |
| Checkpoints          |   No   |    No     |    **Yes**    |
| Time-travel restore  |   No   |    No     |    **Yes**    |
| Branching timelines  |   No   |    No     |    **Yes**    |
| Visual DevTools      | Basic  |    No     |    **Yes**    |
| Works with MSW       |   -    |    No     |    **Yes**    |
| TypeScript support   |  Yes   |  Partial  |    **Yes**    |

---

## Use Cases

### Testing Edge Cases

```typescript
// Setup: Navigate to checkout ready state
mockchain.checkpoint('checkout-ready');

// Test 1: Payment succeeds
mockchain.branch('payment-success', checkoutCheckpoint.id);
// Run success scenario tests...

// Test 2: Payment fails
mockchain.restore(checkoutCheckpoint.id);
mockchain.branch('payment-failure');
// Inject failure response, run tests...

// Test 3: Session expires mid-checkout
mockchain.restore(checkoutCheckpoint.id);
mockchain.branch('session-expired');
// Inject 401 response, run tests...
```

### Demo Environments

```typescript
// Create predictable demo checkpoints
mockchain.checkpoint('demo-empty-state');
// Add some data through UI...
mockchain.checkpoint('demo-with-data');
// Complete a flow...
mockchain.checkpoint('demo-completed');

// Demo presenter can reset instantly
document.querySelector('#reset-demo')?.addEventListener('click', () => {
  const store = mockchain.getStore();
  const initial = store.listCheckpoints().find((cp) => cp.name === 'demo-empty-state');
  if (initial) mockchain.restore(initial.id);
});
```

### Developer Onboarding

```typescript
// Export checkpoint data for team
const store = mockchain.getStore();
const checkpoints = store.listCheckpoints();
const timelines = store.listTimelines();

const exportData = {
  checkpoints: checkpoints.map((cp) => ({
    id: cp.id,
    name: cp.name,
    description: cp.description,
    captures: cp.captures,
  })),
  timelines: timelines.map((t) => ({
    id: t.id,
    name: t.name,
  })),
};

// Save to file or localStorage for sharing
localStorage.setItem('mockchain-onboarding', JSON.stringify(exportData));
```

---

## Packages

| Package                                            | Description                                   | Size  |
| -------------------------------------------------- | --------------------------------------------- | ----- |
| [`@mockchain/core`](./packages/core)               | Core checkpoint and timeline state management | ~5kb  |
| [`@mockchain/msw-adapter`](./packages/msw-adapter) | MSW integration adapter                       | ~2kb  |
| [`@mockchain/devtools`](./packages/devtools)       | React DevTools panel component                | ~10kb |

---

## Examples

Check out the [examples directory](./examples) for complete working demos:

- [React Demo App](./examples/react-demo) - Full e-commerce checkout flow with MockChain

---

## Development

```bash
# Clone the repository
git clone https://github.com/zach-fau/mockchain.git
cd mockchain

# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test

# Run in watch mode
pnpm dev

# Lint code
pnpm lint
```

---

## Contributing

Contributions are welcome! Please read our [Contributing Guide](./CONTRIBUTING.md) for details on:

- Code of conduct
- Development setup
- Submitting pull requests
- Reporting issues

---

## License

MIT - see [LICENSE](./LICENSE) for details.

---

<p align="center">
  Built on <a href="https://mswjs.io/">MSW</a> | Powered by <a href="https://zustand-demo.pmnd.rs/">Zustand</a>
</p>
