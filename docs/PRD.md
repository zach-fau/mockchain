---
name: mockchain
description: Stateful API mocks with checkpoint/branching timelines for time-travel debugging
status: backlog
created: 2026-01-07T14:48:19Z
updated: 2026-01-07T14:48:19Z
---

# MockChain - Time-Travel Debugging for API Mocks

## Problem Statement

Frontend developers waste hours clicking through complex UI flows to recreate specific application states when testing API integrations. Current mocking solutions like MSW (Mock Service Worker) handle basic request/response mocking, but they're fundamentally **stateless** - every time you want to test a different scenario, you either:

1. **Click through the entire flow again** to reach the state you need
2. **Write complex conditional logic** in mock handlers to simulate state changes
3. **Maintain separate mock configurations** for each test scenario

This becomes exponentially worse when testing edge cases:
- "What happens if the payment fails after the user adds 3 items to cart?"
- "How does the UI behave when the auth token expires mid-checkout?"
- "What if the API returns a different response for the same endpoint later in the session?"

**The real pain**: Developers spend 60%+ of their testing time *getting to the state they want to test*, not actually testing.

## Target Users

### Primary: Frontend Developers
- Building React/Vue/Svelte applications that consume REST/GraphQL APIs
- Working on teams where backend APIs are developed in parallel
- Need to test complex multi-step flows (checkout, onboarding, wizards)
- Currently using MSW, Mirage, or similar mocking solutions

### Secondary: QA Engineers
- Writing integration tests that need reproducible API states
- Testing edge cases without modifying backend data
- Creating test scenarios that would be difficult/impossible with real APIs

### Tertiary: Developer Experience Teams
- Building internal tools for frontend development workflows
- Creating demo environments with predictable data
- Onboarding new developers with consistent mock setups

## Core Features (MVP - 3 Weeks)

### 1. Checkpoint System
**What**: Save the current state of all mock responses as a named checkpoint
**Why**: Lets developers "bookmark" interesting states to return to later

```typescript
// Example API
mockchain.checkpoint('user-logged-in');
mockchain.checkpoint('cart-with-3-items');
mockchain.checkpoint('ready-for-checkout');
```

### 2. Time-Travel (Restore)
**What**: Instantly restore mock state to any previous checkpoint
**Why**: Skip the 47 clicks needed to get back to a specific state

```typescript
// Jump back to test a different path
mockchain.restore('cart-with-3-items');
// Now test what happens with payment failure
```

### 3. Branching Timelines
**What**: Create parallel branches from any checkpoint to test different scenarios
**Why**: Test multiple paths from the same state without losing progress

```typescript
mockchain.branch('cart-with-3-items', 'payment-success');
mockchain.branch('cart-with-3-items', 'payment-failure');
mockchain.branch('cart-with-3-items', 'session-expired');
```

### 4. State Inspection
**What**: Visual DevTools panel showing current state, checkpoints, and timeline
**Why**: Understand exactly what mock state you're in

### 5. MSW Integration
**What**: Works as an extension/wrapper around MSW, not a replacement
**Why**: Leverage existing MSW ecosystem, handlers, and community patterns

```typescript
// Enhances existing MSW setup
import { setupWorker } from 'msw/browser';
import { withMockChain } from 'mockchain';

const worker = withMockChain(
  setupWorker(...handlers)
);
```

## Technical Architecture

### Stack
- **TypeScript**: Full type safety, excellent DX
- **Vite**: Fast development, modern bundling
- **Zustand**: Lightweight state management for checkpoint storage
- **Vitest**: Testing framework with excellent DX

### Core Components

```
mockchain/
├── packages/
│   ├── core/                 # Core checkpoint/branching logic
│   │   ├── checkpoint.ts     # Checkpoint creation/restore
│   │   ├── timeline.ts       # Timeline branching management
│   │   ├── state-store.ts    # Zustand store for mock state
│   │   └── index.ts
│   ├── msw-adapter/          # MSW integration layer
│   │   ├── wrapper.ts        # withMockChain() wrapper
│   │   ├── interceptor.ts    # Request/response state capture
│   │   └── index.ts
│   └── devtools/             # Browser DevTools panel
│       ├── panel.tsx         # React-based inspector UI
│       ├── timeline-viz.tsx  # Visual timeline component
│       └── index.ts
├── examples/
│   └── react-app/            # Demo application
└── docs/
```

### Data Flow

```
1. MSW intercepts request
2. MockChain captures request/response pair
3. State stored in Zustand (IndexedDB for persistence)
4. Checkpoint = snapshot of all captured state
5. Restore = replay stored responses for matching requests
6. Branch = copy checkpoint state to new timeline
```

### Key Technical Decisions

1. **MSW Extension, Not Replacement**
   - MSW has 17.5k stars, battle-tested, great docs
   - We add stateful layer, not rewrite mocking logic
   - Users keep their existing handlers

2. **Zustand for State**
   - Lightweight (1.2kb), no boilerplate
   - Built-in devtools integration
   - Easy persistence to IndexedDB

3. **Request Matching Strategy**
   - Match by: method + URL + normalized body hash
   - Allow custom matchers for edge cases
   - Support partial matching for flexible scenarios

4. **Timeline as First-Class Concept**
   - Every session starts on "main" timeline
   - Branches create isolated state spaces
   - Can merge branches or discard

## Success Metrics

### Technical Quality (Resume Value)
- [ ] Clean, modular architecture demonstrating design skills
- [ ] 80%+ test coverage on core functionality
- [ ] TypeScript strict mode with no `any` escapes
- [ ] Sub-100ms checkpoint/restore operations
- [ ] <10kb bundle size for core package

### Functional Completeness
- [ ] Works with existing MSW handlers
- [ ] Checkpoints persist across page refreshes
- [ ] DevTools panel shows timeline visually
- [ ] Can export/import checkpoint sets
- [ ] Works in both browser and Node.js (for testing)

### Developer Experience
- [ ] Setup in <5 minutes with existing MSW project
- [ ] Clear, actionable error messages
- [ ] Comprehensive docs with examples
- [ ] Working demo app showcasing features

### Portfolio Impact
- [ ] Unique value prop (no competitor has this)
- [ ] Solves real pain point (verifiable via dev surveys)
- [ ] Professional README with GIF demos
- [ ] Published to npm with proper versioning

## Differentiation from Competitors

### vs MSW Alone
MSW is stateless. MockChain adds the state layer.

| Feature | MSW | MockChain |
|---------|-----|-----------|
| Request interception | ✅ | ✅ (via MSW) |
| Response mocking | ✅ | ✅ (via MSW) |
| Stateful responses | Manual | ✅ Automatic |
| Checkpoints | ❌ | ✅ |
| Time-travel | ❌ | ✅ |
| Branching timelines | ❌ | ✅ |
| Visual DevTools | Basic | ✅ Timeline view |

### vs Mirage.js
Mirage has a database concept, but no checkpoints/time-travel.

### vs Playwright/Cypress Fixtures
Testing frameworks have fixtures but they're:
- Tied to specific test frameworks
- Don't work for development/manual testing
- No real-time state manipulation

### Unique Value Proposition
**"Git for your mock API state"** - Create commits (checkpoints), branches (parallel scenarios), and travel through time without losing your work.

## Timeline Breakdown

### Week 1: Core Engine
**Days 1-2**: Project setup, architecture
- Monorepo structure with Vite
- TypeScript config, ESLint, Prettier
- Basic Zustand store for state

**Days 3-4**: Checkpoint system
- Capture request/response pairs
- Create/restore checkpoints
- IndexedDB persistence

**Days 5-7**: MSW integration
- `withMockChain()` wrapper
- Request interceptor
- Handler state injection

### Week 2: Branching & DevTools
**Days 1-3**: Timeline branching
- Branch creation/switching
- Isolated state per branch
- Branch merging basics

**Days 4-7**: DevTools panel
- React component for panel
- Timeline visualization
- Checkpoint management UI

### Week 3: Polish & Documentation
**Days 1-2**: Testing
- Unit tests for core
- Integration tests with MSW
- E2E tests for DevTools

**Days 3-4**: Demo app
- React app showcasing features
- Multiple test scenarios
- GIF recordings for README

**Days 5-7**: Documentation & Release
- README with badges
- API documentation
- npm publish
- Demo deployment

## Risk Mitigation

### Risk: MSW API Changes
**Mitigation**: Pin to specific MSW version, document compatibility matrix

### Risk: Scope Creep
**Mitigation**: MVP is checkpoint + restore + basic branching only. Advanced features (merge, conflict resolution, collaborative editing) are v2.

### Risk: Performance with Large State
**Mitigation**:
- Lazy loading of checkpoint data
- Compression for IndexedDB storage
- Configurable state retention limits

### Risk: Browser Compatibility
**Mitigation**: Target modern browsers only (Chrome, Firefox, Safari, Edge latest 2 versions)

## Non-Goals (Not in MVP)

- ❌ GraphQL-specific features (REST focus first)
- ❌ Collaborative/shared checkpoints (single-user first)
- ❌ CI/CD integration (development-focused first)
- ❌ Recording production traffic
- ❌ Response delay/latency simulation (MSW handles this)
- ❌ WebSocket mocking

## Resume Story

**Why I Built This**:
"While building a complex e-commerce checkout flow, I spent more time clicking through the UI to reach test states than actually testing. Existing mock tools are stateless - they can't remember what happened before. MockChain adds the missing state layer, letting developers create checkpoints and branch timelines like Git branches. It's already helping me test edge cases in minutes instead of hours."

**Skills Demonstrated**:
- TypeScript/JavaScript expertise
- State management architecture (Zustand)
- Browser extension/DevTools development
- MSW ecosystem knowledge
- Developer tooling & DX focus
- Monorepo management
- Testing strategies (unit, integration, E2E)

**Talking Points for Interviews**:
1. Identified gap in existing ecosystem (MSW is great but stateless)
2. Built as extension, not replacement (respects existing tools)
3. Chose minimal dependencies (Zustand over Redux)
4. Designed for incremental adoption (works with existing setup)
5. Focused on DX (DevTools panel, clear errors)
