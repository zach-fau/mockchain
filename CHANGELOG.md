# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial project setup with monorepo structure
- `@mockchain/core`: Core checkpoint and timeline management
  - Checkpoint creation, restore, and deletion
  - Timeline branching and switching
  - Request/response pair capture and storage
  - Zustand-based state management
- `@mockchain/msw`: MSW integration adapter
  - `withMockChain()` wrapper for MSW SetupWorker
  - Automatic request/response capture
  - Convenience methods for checkpoint/restore/branch
- `@mockchain/devtools`: React DevTools panel
  - Visual checkpoint management
  - Timeline switching
  - Capture count display
- TypeScript support with strict mode
- ESLint + Prettier configuration
- Vitest for testing
- Husky + lint-staged for pre-commit hooks

### Technical Details
- Monorepo managed with pnpm workspaces
- Vite for building library packages
- Full TypeScript strict mode compliance
- React 19 for DevTools panel
