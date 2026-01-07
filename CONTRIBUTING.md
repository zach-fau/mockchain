# Contributing to MockChain

Thank you for your interest in contributing to MockChain! This document provides guidelines and instructions for contributing.

## Development Setup

### Prerequisites

- Node.js 20+
- pnpm 9+

### Getting Started

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
```

## Project Structure

```
mockchain/
├── packages/
│   ├── core/           # Core checkpoint/timeline logic
│   ├── msw-adapter/    # MSW integration
│   └── devtools/       # React DevTools panel
├── examples/           # Example applications
└── docs/               # Documentation
```

## Development Workflow

### Running in Development Mode

```bash
# Build all packages in watch mode
pnpm dev

# Run tests in watch mode
pnpm test:watch
```

### Building

```bash
# Build all packages
pnpm build

# Build specific package
pnpm --filter @mockchain/core build
```

### Testing

```bash
# Run all tests
pnpm test

# Run tests with coverage
pnpm test:coverage

# Run tests for specific package
pnpm --filter @mockchain/core test
```

### Linting and Formatting

```bash
# Lint all files
pnpm lint

# Fix lint errors
pnpm lint:fix

# Format all files
pnpm format

# Check formatting
pnpm format:check
```

### Type Checking

```bash
# Type check all packages
pnpm typecheck
```

## Code Style

- We use ESLint for linting and Prettier for formatting
- TypeScript strict mode is enabled
- Write tests for new functionality
- Keep functions small and focused
- Use meaningful variable and function names
- Add JSDoc comments for public APIs

### Commit Messages

Follow the conventional commits format:

```
type(scope): description

[optional body]

[optional footer]
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

Examples:
```
feat(core): add checkpoint deletion
fix(msw): handle request body parsing errors
docs: update API reference
```

## Pull Request Process

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/my-feature`
3. Make your changes
4. Run tests: `pnpm test`
5. Run linting: `pnpm lint`
6. Commit your changes using conventional commits
7. Push to your fork
8. Open a pull request

### PR Checklist

- [ ] Tests pass (`pnpm test`)
- [ ] Linting passes (`pnpm lint`)
- [ ] Types check (`pnpm typecheck`)
- [ ] Documentation updated if needed
- [ ] Commit messages follow convention

## Reporting Issues

When reporting issues, please include:

1. MockChain version
2. MSW version
3. Browser/Node.js version
4. Steps to reproduce
5. Expected behavior
6. Actual behavior
7. Error messages (if any)

## Feature Requests

Feature requests are welcome! Please:

1. Check existing issues first
2. Describe the use case
3. Explain the proposed solution
4. Consider alternatives

## Questions?

Feel free to open an issue for questions about contributing.
