export { withMockChain, type WithMockChainOptions, type MockChainMethods } from './wrapper';
export {
  withMockChainServer,
  type WithMockChainServerOptions,
  type MockChainServerMethods,
} from './server-wrapper';

// Re-export core types for convenience
export type {
  Checkpoint,
  Timeline,
  CapturedPair,
  CapturedRequest,
  CapturedResponse,
} from '@mockchain/core';
