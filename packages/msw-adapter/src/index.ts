export { withMockChain, type WithMockChainOptions, type MockChainMethods } from './wrapper';

// Re-export core types for convenience
export type {
  Checkpoint,
  Timeline,
  CapturedPair,
  CapturedRequest,
  CapturedResponse,
} from '@mockchain/core';
