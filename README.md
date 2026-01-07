# MockChain

**Time-travel debugging for API mocks**

MockChain extends [MSW (Mock Service Worker)](https://mswjs.io/) with stateful checkpoints, restore functionality, and branching timelines. Stop clicking through your UI to recreate test states - just checkpoint, branch, and restore.

[![npm version](https://img.shields.io/npm/v/@mockchain/core.svg)](https://www.npmjs.com/package/@mockchain/core)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)

## The Problem

Frontend developers waste hours clicking through complex UI flows to recreate specific application states when testing. Current mocking solutions are **stateless** - every time you want to test a different scenario, you either:

- Click through the entire flow again
- Write complex conditional logic in mock handlers
- Maintain separate mock configurations for each scenario

## The Solution

MockChain adds a **state layer** to your existing MSW setup:

```typescript
import { setupWorker } from 'msw/browser';
import { withMockChain } from '@mockchain/msw';
import { handlers } from './handlers';

const worker = withMockChain(setupWorker(...handlers));
await worker.start();

// 1. Use your app normally, MockChain captures request/response pairs
// 2. Save checkpoints at interesting states
worker.mockchain.checkpoint('user-logged-in');
worker.mockchain.checkpoint('cart-with-items');
worker.mockchain.checkpoint('ready-for-checkout');

// 3. Later, restore to any checkpoint instantly
worker.mockchain.restore('cart-with-items');

// 4. Branch to test different scenarios from the same state
worker.mockchain.branch('payment-success', 'cart-with-items');
worker.mockchain.branch('payment-failure', 'cart-with-items');
```

## Features

- **Checkpoints**: Save snapshots of your mock state at any point
- **Time-Travel**: Instantly restore to any previous checkpoint
- **Branching Timelines**: Create parallel branches to test different scenarios
- **MSW Integration**: Works with your existing MSW handlers (not a replacement)
- **DevTools Panel**: Visual interface to manage checkpoints and timelines
- **TypeScript First**: Full type safety and excellent DX

## Installation

```bash
# Using pnpm (recommended)
pnpm add @mockchain/core @mockchain/msw

# Using npm
npm install @mockchain/core @mockchain/msw

# Using yarn
yarn add @mockchain/core @mockchain/msw
```

## Quick Start

### 1. Wrap your MSW worker

```typescript
// src/mocks/browser.ts
import { setupWorker } from 'msw/browser';
import { withMockChain } from '@mockchain/msw';
import { handlers } from './handlers';

export const worker = withMockChain(setupWorker(...handlers));
```

### 2. Start the worker in your app

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

### 3. Create checkpoints and restore

```typescript
// In your browser console or test code
const { mockchain } = worker;

// Save current state
mockchain.checkpoint('after-login');

// Do stuff in your app...

// Restore to checkpoint
mockchain.restore('after-login');

// Create a branch for testing error case
mockchain.branch('error-scenario');
```

### 4. (Optional) Add DevTools Panel

```tsx
// src/App.tsx
import { MockChainPanel } from '@mockchain/devtools';
import { worker } from './mocks/browser';

function App() {
  return (
    <>
      {/* Your app content */}
      {process.env.NODE_ENV === 'development' && (
        <MockChainPanel store={worker.mockchain.getStore()} />
      )}
    </>
  );
}
```

## API Reference

### `withMockChain(worker, options?)`

Wraps an MSW `SetupWorker` with MockChain functionality.

```typescript
interface WithMockChainOptions {
  // Whether to automatically capture all requests (default: true)
  autoCapture?: boolean;
  // Request patterns to exclude from capture
  exclude?: (string | RegExp)[];
}
```

### `worker.mockchain`

Methods available on the enhanced worker:

| Method | Description |
|--------|-------------|
| `checkpoint(name, description?)` | Create a checkpoint with current state |
| `restore(checkpointId)` | Restore to a previous checkpoint |
| `branch(name, fromCheckpointId?)` | Create a new timeline branch |
| `switchTimeline(timelineId)` | Switch to a different timeline |
| `getStore()` | Get the underlying MockChain store |

### Core Store

Direct access to the store for advanced usage:

```typescript
import { getMockChainStore } from '@mockchain/core';

const store = getMockChainStore();

// Create/manage checkpoints
store.createCheckpoint({ name: 'my-checkpoint' });
store.listCheckpoints();
store.restoreCheckpoint('checkpoint-id');

// Create/manage timelines
store.createBranch({ name: 'test-branch' });
store.listTimelines();
store.switchTimeline('timeline-id');

// Query current state
store.getCaptures();
store.findCapture('GET', '/api/users');
```

## Packages

| Package | Description |
|---------|-------------|
| `@mockchain/core` | Core checkpoint and timeline management |
| `@mockchain/msw` | MSW integration adapter |
| `@mockchain/devtools` | React DevTools panel component |

## Use Cases

### Testing Edge Cases

```typescript
// Setup: User has items in cart
mockchain.checkpoint('cart-ready');

// Test 1: Payment success
mockchain.branch('payment-success', 'cart-ready');
// Configure success response, run tests

// Test 2: Payment failure
mockchain.restore('cart-ready');
mockchain.branch('payment-failure');
// Configure failure response, run tests

// Test 3: Session expired
mockchain.restore('cart-ready');
mockchain.branch('session-expired');
// Configure expired session, run tests
```

### Demo Environments

```typescript
// Create predictable demo state
mockchain.checkpoint('demo-initial');
mockchain.checkpoint('demo-populated');
mockchain.checkpoint('demo-complete');

// Demo presenter can reset to any state instantly
document.getElementById('reset-demo')?.addEventListener('click', () => {
  mockchain.restore('demo-initial');
});
```

### Developer Onboarding

```typescript
// Export checkpoint data for new team members
const checkpoints = mockchain.getStore().listCheckpoints();
localStorage.setItem('mockchain-onboarding', JSON.stringify(checkpoints));
```

## Development

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test

# Run in watch mode
pnpm dev
```

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development guidelines.

## License

MIT - see [LICENSE](./LICENSE) for details.

---

Built with [MSW](https://mswjs.io/) | Powered by [Zustand](https://zustand-demo.pmnd.rs/)
