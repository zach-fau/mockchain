import type { SetupWorker } from 'msw/browser';
import {
  getMockChainStore,
  type CapturedPair,
  type CapturedRequest,
  type CapturedResponse,
} from '@mockchain/core';

export interface WithMockChainOptions {
  /** Whether to automatically capture all requests */
  autoCapture?: boolean;
  /** Request patterns to exclude from capture */
  exclude?: (string | RegExp)[];
}

const defaultOptions: Required<WithMockChainOptions> = {
  autoCapture: true,
  exclude: [],
};

/**
 * Wraps an MSW SetupWorker with MockChain functionality
 *
 * @example
 * ```ts
 * import { setupWorker } from 'msw/browser';
 * import { withMockChain } from '@mockchain/msw';
 * import { handlers } from './handlers';
 *
 * const worker = withMockChain(setupWorker(...handlers));
 * await worker.start();
 * ```
 */
export function withMockChain(
  worker: SetupWorker,
  options: WithMockChainOptions = {}
): SetupWorker & MockChainMethods {
  const opts = { ...defaultOptions, ...options };
  const store = getMockChainStore();

  // Track request start times for response time calculation
  const requestStartTimes = new Map<string, number>();

  // Add lifecycle events to capture requests/responses
  worker.events.on('request:start', ({ request, requestId }) => {
    if (!opts.autoCapture) return;
    if (shouldExclude(request.url, opts.exclude)) return;

    requestStartTimes.set(requestId, Date.now());
  });

  worker.events.on('request:match', async ({ request, requestId }) => {
    // Request matched a handler - we'll capture the response
    if (!opts.autoCapture) return;
    if (shouldExclude(request.url, opts.exclude)) return;

    // Clone request for capture (request body can only be read once)
    const clonedRequest = request.clone();
    const body = await parseBody(clonedRequest);

    const captured: CapturedRequest = {
      id: requestId,
      method: request.method,
      url: request.url,
      headers: Object.fromEntries(request.headers.entries()),
      body,
      timestamp: requestStartTimes.get(requestId) ?? Date.now(),
    };

    // Store request temporarily - we'll pair it with response later
    (worker as unknown as { __mockchain_pending: Map<string, CapturedRequest> }).__mockchain_pending =
      (worker as unknown as { __mockchain_pending: Map<string, CapturedRequest> }).__mockchain_pending ??
      new Map();
    (
      worker as unknown as { __mockchain_pending: Map<string, CapturedRequest> }
    ).__mockchain_pending.set(requestId, captured);
  });

  worker.events.on('response:mocked', async ({ response, requestId }) => {
    if (!opts.autoCapture) return;

    const pending = (worker as unknown as { __mockchain_pending?: Map<string, CapturedRequest> })
      .__mockchain_pending;
    const capturedRequest = pending?.get(requestId);

    if (!capturedRequest) return;

    // Clean up pending
    pending?.delete(requestId);

    const startTime = requestStartTimes.get(requestId);
    requestStartTimes.delete(requestId);

    const clonedResponse = response.clone();
    const body = await parseBody(clonedResponse);

    const capturedResponse: CapturedResponse = {
      status: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      body,
      responseTime: startTime ? Date.now() - startTime : 0,
    };

    const pair: CapturedPair = {
      request: capturedRequest,
      response: capturedResponse,
    };

    store.capture(pair);
  });

  // Add MockChain methods to the worker
  const enhanced = worker as SetupWorker & MockChainMethods;

  enhanced.mockchain = {
    checkpoint: (name: string, description?: string) => {
      return store.createCheckpoint({ name, description });
    },
    restore: (checkpointId: string) => {
      store.restoreCheckpoint(checkpointId);
    },
    branch: (name: string, fromCheckpointId?: string) => {
      return store.createBranch({ name, fromCheckpointId });
    },
    switchTimeline: (timelineId: string) => {
      store.switchTimeline(timelineId);
    },
    getStore: () => store,
  };

  return enhanced;
}

export interface MockChainMethods {
  mockchain: {
    /** Create a checkpoint with the current mock state */
    checkpoint: (name: string, description?: string) => ReturnType<typeof getMockChainStore>['createCheckpoint'];
    /** Restore to a previous checkpoint */
    restore: (checkpointId: string) => void;
    /** Create a new timeline branch */
    branch: (name: string, fromCheckpointId?: string) => ReturnType<typeof getMockChainStore>['createBranch'];
    /** Switch to a different timeline */
    switchTimeline: (timelineId: string) => void;
    /** Get the underlying MockChain store */
    getStore: () => ReturnType<typeof getMockChainStore>;
  };
}

function shouldExclude(url: string, patterns: (string | RegExp)[]): boolean {
  return patterns.some((pattern) => {
    if (typeof pattern === 'string') {
      return url.includes(pattern);
    }
    return pattern.test(url);
  });
}

async function parseBody(requestOrResponse: Request | Response): Promise<unknown> {
  try {
    const contentType = requestOrResponse.headers.get('content-type') ?? '';

    if (contentType.includes('application/json')) {
      return await requestOrResponse.json();
    }

    if (contentType.includes('text/')) {
      return await requestOrResponse.text();
    }

    // For other types, try to get as text
    const text = await requestOrResponse.text();
    if (text) return text;

    return undefined;
  } catch {
    return undefined;
  }
}
