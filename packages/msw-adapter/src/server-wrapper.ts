import type { SetupServer } from 'msw/node';
import {
  getMockChainStore,
  type CapturedPair,
  type CapturedRequest,
  type CapturedResponse,
} from '@mockchain/core';

export interface WithMockChainServerOptions {
  /** Whether to automatically capture all requests */
  autoCapture?: boolean;
  /** Request patterns to exclude from capture */
  exclude?: (string | RegExp)[];
}

const defaultOptions: Required<WithMockChainServerOptions> = {
  autoCapture: true,
  exclude: [],
};

// Pending request tracking with cloned request for body parsing
interface PendingRequest {
  id: string;
  method: string;
  url: string;
  headers: Record<string, string>;
  timestamp: number;
  clonedRequest: Request | null;
}

/**
 * Wraps an MSW SetupServer with MockChain functionality (for Node.js testing)
 *
 * @example
 * ```ts
 * import { setupServer } from 'msw/node';
 * import { withMockChainServer } from '@mockchain/msw';
 * import { handlers } from './handlers';
 *
 * const server = withMockChainServer(setupServer(...handlers));
 * server.listen();
 * ```
 */
export function withMockChainServer(
  server: SetupServer,
  options: WithMockChainServerOptions = {}
): SetupServer & MockChainServerMethods {
  const opts = { ...defaultOptions, ...options };
  const store = getMockChainStore();

  // Track request start times for response time calculation
  const requestStartTimes = new Map<string, number>();
  // Track pending requests (awaiting response)
  const pendingRequests = new Map<string, PendingRequest>();

  // Add lifecycle events to capture requests/responses
  server.events.on('request:start', ({ request, requestId }) => {
    if (!opts.autoCapture) return;
    if (shouldExclude(request.url, opts.exclude)) return;

    requestStartTimes.set(requestId, Date.now());
  });

  server.events.on('request:match', ({ request, requestId }) => {
    // Request matched a handler - store it synchronously to ensure it's available for response:mocked
    if (!opts.autoCapture) return;
    if (shouldExclude(request.url, opts.exclude)) return;

    // Try to clone the request for body parsing later
    // The clone may fail if the body has already been consumed
    let clonedRequest: Request | null = null;
    try {
      clonedRequest = request.clone();
    } catch {
      // Body already consumed, we'll skip body capture for this request
    }

    // Store request info synchronously (body will be parsed later if available)
    const pending: PendingRequest = {
      id: requestId,
      method: request.method,
      url: request.url,
      headers: Object.fromEntries(request.headers.entries()),
      timestamp: requestStartTimes.get(requestId) ?? Date.now(),
      clonedRequest,
    };

    pendingRequests.set(requestId, pending);
  });

  server.events.on('response:mocked', ({ response, requestId }) => {
    if (!opts.autoCapture) return;

    const pending = pendingRequests.get(requestId);
    if (!pending) return;

    // Clean up pending
    pendingRequests.delete(requestId);

    const startTime = requestStartTimes.get(requestId);
    requestStartTimes.delete(requestId);

    // Parse bodies and capture asynchronously
    void (async () => {
      const [requestBody, responseBody] = await Promise.all([
        pending.clonedRequest ? parseBody(pending.clonedRequest) : Promise.resolve(undefined),
        parseBody(response.clone()),
      ]);

      const capturedRequest: CapturedRequest = {
        id: pending.id,
        method: pending.method,
        url: pending.url,
        headers: pending.headers,
        body: requestBody,
        timestamp: pending.timestamp,
      };

      const capturedResponse: CapturedResponse = {
        status: response.status,
        headers: Object.fromEntries(response.headers.entries()),
        body: responseBody,
        responseTime: startTime ? Date.now() - startTime : 0,
      };

      const pair: CapturedPair = {
        request: capturedRequest,
        response: capturedResponse,
      };

      store.capture(pair);
    })();
  });

  // Add MockChain methods to the server
  const enhanced = server as SetupServer & MockChainServerMethods;

  enhanced.mockchain = {
    checkpoint: (name: string, description?: string) => {
      return store.createCheckpoint({
        name,
        ...(description !== undefined && { description }),
      });
    },
    restore: (checkpointId: string) => {
      store.restoreCheckpoint(checkpointId);
    },
    branch: (name: string, fromCheckpointId?: string) => {
      return store.createBranch({
        name,
        ...(fromCheckpointId !== undefined && { fromCheckpointId }),
      });
    },
    switchTimeline: (timelineId: string) => {
      store.switchTimeline(timelineId);
    },
    getStore: () => store,
  };

  return enhanced;
}

export interface MockChainServerMethods {
  mockchain: {
    /** Create a checkpoint with the current mock state */
    checkpoint: (
      name: string,
      description?: string
    ) => ReturnType<ReturnType<typeof getMockChainStore>['createCheckpoint']>;
    /** Restore to a previous checkpoint */
    restore: (checkpointId: string) => void;
    /** Create a new timeline branch */
    branch: (
      name: string,
      fromCheckpointId?: string
    ) => ReturnType<ReturnType<typeof getMockChainStore>['createBranch']>;
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
