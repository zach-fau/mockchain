import { setupWorker } from 'msw/browser';
import { withMockChain } from '@mockchain/msw';
import { handlers } from './handlers';

// Create the MSW worker wrapped with MockChain
export const worker = withMockChain(setupWorker(...handlers));
