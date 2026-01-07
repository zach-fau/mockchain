import { setupWorker } from 'msw/browser';
import { withMockChain } from '@mockchain/msw';
import { handlers } from './handlers';

// Create the MSW worker with MockChain integration
const baseWorker = setupWorker(...handlers);
export const worker = withMockChain(baseWorker);
