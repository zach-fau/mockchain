# MockChain - Project Context

## What Is This?

MockChain is a **time-travel debugging tool for API mocks** - an MSW extension that adds checkpoints, restore, and branching timelines. It's a portfolio project demonstrating TypeScript, state management, and developer tooling skills.

**Timeline**: 3 weeks | **Status**: Initial setup complete, development starting

## Quick Links

- **GitHub**: https://github.com/zach-fau/mockchain
- **PRD**: `docs/PRD.md` (full product requirements)
- **Architecture**: `ARCHITECTURE.md`

## Project Structure

```
mockchain/
├── packages/
│   ├── core/           # Checkpoint/timeline state management (Zustand)
│   ├── msw-adapter/    # MSW wrapper with auto-capture
│   └── devtools/       # React DevTools panel
├── examples/           # Demo apps (TODO)
├── docs/
│   └── PRD.md          # Full product requirements
└── CLAUDE.md           # You are here
```

## Current State

### Completed
- [x] Project scaffolding (monorepo, TypeScript, Vite)
- [x] Core types and store implementation
- [x] MSW wrapper skeleton
- [x] DevTools panel component
- [x] Documentation (README, ARCHITECTURE, CONTRIBUTING)
- [x] Pushed to GitHub

### Needs Fixing Before Build
- [ ] **ESLint errors** - 57 strict TypeScript errors
  - `packages/msw-adapter/src/wrapper.ts` - async handlers, type inference
  - `packages/devtools/src/MockChainPanel.tsx` - store prop typing
  - Run `pnpm lint` to see full list

### Next Steps (Week 1)
- [ ] Fix ESLint errors
- [ ] Write tests for @mockchain/core
- [ ] Test MSW integration with real handlers
- [ ] Verify build works (`pnpm build`)

## Commands

```bash
pnpm install        # Install dependencies
pnpm build          # Build all packages
pnpm test           # Run tests
pnpm lint           # Check for errors
pnpm dev            # Watch mode
```

## Key Technical Decisions

1. **MSW Extension, Not Replacement** - Works with existing handlers
2. **Zustand for State** - Lightweight, no React dependency in core
3. **Monorepo with pnpm** - Proper package separation
4. **TypeScript Strict Mode** - Full type safety

## Task Tracking

**Use GitHub Issues** for task tracking:
- Create issues for each feature/bug
- Use labels: `bug`, `enhancement`, `documentation`
- Reference issues in commits: `Issue #123: Add feature`

## Research Context

This project was selected from 40 analyzed ideas based on:
- **Unique value**: No competitor has time-travel for API mocks
- **Resume value**: Demonstrates state management, dev tooling, MSW ecosystem
- **Achievable scope**: 3-week timeline is realistic

Full research available in: `/home/gyatso/Development/career-planning/.claude/research/`

## For New Sessions

When starting a new Claude session on this project:
1. Read this file for context
2. Check GitHub Issues for current tasks
3. Run `pnpm lint` to see current state
4. Check `docs/PRD.md` for feature requirements
