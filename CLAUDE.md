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

**Lint**: ✅ Passes | **Build**: ✅ Passes | **Tests**: Not yet written

### What's Done

- Project scaffolding (monorepo, TypeScript strict mode, Vite)
- Core types and store implementation (Zustand)
- MSW wrapper with auto-capture
- DevTools panel component (React)
- Documentation (README, ARCHITECTURE, CONTRIBUTING)

### What's Next

**Check GitHub Issues** for current tasks:

```bash
gh issue list --repo zach-fau/mockchain
```

If no open issues, reference `docs/PRD.md` Week 1-3 breakdown to create them.

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

## For New Sessions - READ THIS FIRST

When the user says "let's work on mockchain" or "continue working":

### Step 1: Check GitHub Issues

```bash
gh issue list --repo zach-fau/mockchain
```

This shows the current tasks. Pick the highest priority open issue.

### Step 2: Understand Current State

```bash
pnpm lint    # See if there are errors to fix
pnpm build   # See if build works
git status   # Check for uncommitted work
```

### Step 3: Start Working

- If there's an open issue, work on it
- Reference the issue in commits: `Issue #1: Fix ESLint errors`
- Create new issues for work discovered along the way

### Step 4: When Done with a Task

```bash
git add -A && git commit -m "Issue #X: Description"
git push origin main
gh issue close X
```

### If No Issues Exist

Reference `docs/PRD.md` for the Week 1-3 breakdown and create issues:

```bash
gh issue create --title "Task name" --body "Description" --label enhancement
```

### Quick Commands Reference

```bash
gh issue list                    # See all tasks
gh issue view 1                  # See issue details
gh issue create                  # Create new issue
gh issue close 1                 # Mark issue done
pnpm lint                        # Check for errors
pnpm build                       # Build packages
pnpm test                        # Run tests
```
