# MockChain Architecture

This document describes the high-level architecture and design decisions of MockChain.

## Overview

MockChain is designed as a **state layer** that wraps around MSW (Mock Service Worker). It captures request/response pairs and provides checkpoint, restore, and branching capabilities.

```
┌─────────────────────────────────────────────────────────────┐
│                        Your App                              │
├─────────────────────────────────────────────────────────────┤
│                     MSW Service Worker                       │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                  MockChain Wrapper                     │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐  │  │
│  │  │   Capture    │  │  Checkpoint  │  │  Timeline   │  │  │
│  │  │   Layer      │  │   Manager    │  │  Manager    │  │  │
│  │  └──────────────┘  └──────────────┘  └─────────────┘  │  │
│  │                         │                              │  │
│  │                    ┌────▼────┐                         │  │
│  │                    │ Zustand │                         │  │
│  │                    │  Store  │                         │  │
│  │                    └────┬────┘                         │  │
│  │                         │                              │  │
│  │                    ┌────▼────┐                         │  │
│  │                    │IndexedDB│                         │  │
│  │                    └─────────┘                         │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Core Concepts

### 1. Captured Pairs

Every request/response that MSW handles is captured as a "pair":

```typescript
interface CapturedPair {
  request: {
    id: string;
    method: string;
    url: string;
    headers: Record<string, string>;
    body?: unknown;
    timestamp: number;
  };
  response: {
    status: number;
    headers: Record<string, string>;
    body: unknown;
    responseTime: number;
  };
}
```

### 2. Checkpoints

A checkpoint is a snapshot of all captured pairs at a point in time:

```typescript
interface Checkpoint {
  id: string;
  name: string;
  timelineId: string;
  captures: CapturedPair[];
  createdAt: number;
  description?: string;
}
```

### 3. Timelines

Timelines enable branching - creating parallel "universes" of mock state:

```
main ─────○─────○─────○──────────────>
                │
                └──── branch-A ─○───○───>
                │
                └──── branch-B ─○──────>
```

```typescript
interface Timeline {
  id: string;
  name: string;
  parentId: string | null;
  branchedFromCheckpointId: string | null;
  createdAt: number;
}
```

## Package Structure

### @mockchain/core

The core package contains:

- **types.ts**: Type definitions for all data structures
- **store.ts**: Zustand store with all state management logic
- **utils.ts**: Helper functions (ID generation, hashing, etc.)

Key design decisions:
- Uses Zustand vanilla store (no React dependency)
- Immutable state updates
- Map data structures for O(1) lookups

### @mockchain/msw

The MSW adapter provides:

- **wrapper.ts**: `withMockChain()` function that wraps MSW worker
- Automatic request/response capture via MSW lifecycle events
- Convenience methods on the worker object

Key design decisions:
- Non-invasive wrapping (doesn't modify MSW internals)
- Leverages MSW's event system for capture
- Async body parsing with proper cloning

### @mockchain/devtools

The DevTools panel provides:

- **MockChainPanel.tsx**: React component for visual management
- Timeline visualization
- Checkpoint CRUD operations

Key design decisions:
- Standalone React component (can be mounted anywhere)
- Polling-based state sync (simple, no subscription complexity)
- Minimal styling with CSS-in-JS

## State Flow

### Capture Flow

```
1. App makes fetch request
2. MSW intercepts request
3. MSW fires 'request:start' event
4. MockChain records start time
5. MSW handler processes request
6. MSW fires 'request:match' event
7. MockChain captures request details
8. MSW fires 'response:mocked' event
9. MockChain captures response, pairs with request
10. Pair added to currentCaptures in store
```

### Checkpoint Flow

```
1. User calls mockchain.checkpoint('name')
2. Store creates Checkpoint object
3. Current captures copied to checkpoint
4. Checkpoint added to checkpoints Map
5. (Optional) Persist to IndexedDB
```

### Restore Flow

```
1. User calls mockchain.restore(checkpointId)
2. Store looks up checkpoint
3. currentCaptures replaced with checkpoint's captures
4. currentTimelineId set to checkpoint's timeline
5. App can now replay requests from this state
```

### Branch Flow

```
1. User calls mockchain.branch('name', fromCheckpointId?)
2. Store creates new Timeline object
3. If fromCheckpointId provided, captures copied from that checkpoint
4. Otherwise, current captures copied
5. currentTimelineId switched to new timeline
```

## Design Decisions

### Why Zustand?

- **Lightweight**: ~1.2kb gzipped
- **No boilerplate**: Simple API
- **Framework agnostic**: Vanilla store works without React
- **DevTools support**: Built-in integration
- **Middleware**: Easy persistence, logging

### Why Not Redux?

- Overkill for this use case
- More boilerplate
- Larger bundle size
- MockChain's state is relatively simple

### Why Maps Instead of Objects?

- O(1) insertion and deletion
- Predictable iteration order
- Better memory characteristics for frequent updates
- Clear semantic distinction from plain objects

### Why Event-Based Capture?

- Non-invasive to MSW handlers
- Automatic capture of all requests
- No need to modify existing handler code
- Clean separation of concerns

### Why IndexedDB for Persistence?

- Large storage capacity
- Works in both main thread and service worker
- Async API (non-blocking)
- Structured data support

## Performance Considerations

### Memory Usage

- Captures accumulate in memory
- Consider implementing:
  - Maximum capture limit
  - Automatic pruning of old captures
  - Compression for large payloads

### Serialization

- Request/response bodies are serialized
- Binary data may need special handling
- Consider size limits for individual captures

### Store Updates

- Zustand batches updates efficiently
- Map spread operations are fast
- Deep cloning only when necessary

## Future Architecture Considerations

### Potential Enhancements

1. **Persistence Layer**: Abstract IndexedDB into pluggable backends
2. **Network Sync**: Share checkpoints between team members
3. **Recording Mode**: Capture from real APIs, not just mocks
4. **Playback Mode**: Replay captured sequences automatically
5. **Diff Engine**: Show differences between checkpoints

### Scalability

Current architecture supports:
- Hundreds of captured pairs efficiently
- Dozens of checkpoints per timeline
- Multiple concurrent timelines

For larger scale, consider:
- Lazy loading of checkpoint data
- Pagination for large capture lists
- Background persistence
