import { describe, it, expect, beforeAll, afterAll, afterEach, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { withMockChainServer, type MockChainServerMethods } from './server-wrapper';
import { resetMockChainStore } from '@mockchain/core';
import type { SetupServer } from 'msw/node';

// Test handlers
const handlers = [
  http.get('https://api.example.com/users', () => {
    return HttpResponse.json([
      { id: 1, name: 'John Doe' },
      { id: 2, name: 'Jane Doe' },
    ]);
  }),

  http.get('https://api.example.com/users/:id', ({ params }) => {
    const id = params.id as string;
    return HttpResponse.json({ id: Number(id), name: `User ${id}` });
  }),

  http.post('https://api.example.com/users', async ({ request }) => {
    const body = (await request.json()) as { name: string };
    return HttpResponse.json({ id: 3, name: body.name }, { status: 201 });
  }),

  http.put('https://api.example.com/users/:id', async ({ params, request }) => {
    const { id } = params;
    const body = (await request.json()) as { name: string };
    return HttpResponse.json({ id: Number(id), name: body.name });
  }),

  http.delete('https://api.example.com/users/:id', ({ params }) => {
    const { id } = params;
    return HttpResponse.json({ deleted: true, id: Number(id) });
  }),
];

describe('withMockChainServer', () => {
  let server: SetupServer & MockChainServerMethods;

  beforeAll(() => {
    server = withMockChainServer(setupServer(...handlers));
    server.listen({ onUnhandledRequest: 'bypass' });
  });

  afterAll(() => {
    server.close();
  });

  beforeEach(() => {
    resetMockChainStore();
  });

  afterEach(() => {
    server.resetHandlers();
  });

  describe('Wrapper Initialization', () => {
    it('should initialize correctly and have mockchain methods', () => {
      expect(server.mockchain).toBeDefined();
      expect(server.mockchain.checkpoint).toBeInstanceOf(Function);
      expect(server.mockchain.restore).toBeInstanceOf(Function);
      expect(server.mockchain.branch).toBeInstanceOf(Function);
      expect(server.mockchain.switchTimeline).toBeInstanceOf(Function);
      expect(server.mockchain.getStore).toBeInstanceOf(Function);
    });

    it('should return the underlying store', () => {
      const store = server.mockchain.getStore();
      expect(store).toBeDefined();
      expect(store.capture).toBeInstanceOf(Function);
      expect(store.getCaptures).toBeInstanceOf(Function);
    });
  });

  describe('Request/Response Capture', () => {
    it('should capture GET request/response pairs', async () => {
      const store = server.mockchain.getStore();

      const response = await fetch('https://api.example.com/users');
      const data = (await response.json()) as unknown[];

      expect(data).toEqual([
        { id: 1, name: 'John Doe' },
        { id: 2, name: 'Jane Doe' },
      ]);

      // Wait for async capture to complete
      await new Promise((resolve) => setTimeout(resolve, 50));

      const captures = store.getCaptures();
      expect(captures.length).toBeGreaterThanOrEqual(1);

      const capture = captures.find((c) => c.request.url === 'https://api.example.com/users');
      expect(capture).toBeDefined();
      expect(capture?.request.method).toBe('GET');
      expect(capture?.response.status).toBe(200);
    });

    it('should capture POST request and response', async () => {
      const store = server.mockchain.getStore();

      const response = await fetch('https://api.example.com/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'New User' }),
      });
      const data = (await response.json()) as { id: number; name: string };

      expect(data).toEqual({ id: 3, name: 'New User' });

      // Wait for async capture to complete
      await new Promise((resolve) => setTimeout(resolve, 50));

      const captures = store.getCaptures();
      const capture = captures.find(
        (c) => c.request.url === 'https://api.example.com/users' && c.request.method === 'POST'
      );

      expect(capture).toBeDefined();
      expect(capture?.request.method).toBe('POST');
      expect(capture?.response.status).toBe(201);
      expect(capture?.response.body).toEqual({ id: 3, name: 'New User' });
      // Note: Request body may not be captured if the handler already consumed it
    });

    it('should capture multiple requests in sequence', async () => {
      const store = server.mockchain.getStore();

      await fetch('https://api.example.com/users');
      await fetch('https://api.example.com/users/1');
      await fetch('https://api.example.com/users/2');

      // Wait for async captures to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      const captures = store.getCaptures();
      expect(captures.length).toBeGreaterThanOrEqual(3);
    });

    it('should capture different HTTP methods', async () => {
      const store = server.mockchain.getStore();

      // GET
      await fetch('https://api.example.com/users');

      // POST
      await fetch('https://api.example.com/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Test' }),
      });

      // PUT
      await fetch('https://api.example.com/users/1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Updated' }),
      });

      // DELETE
      await fetch('https://api.example.com/users/1', {
        method: 'DELETE',
      });

      // Wait for async captures to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      const captures = store.getCaptures();
      const methods = captures.map((c) => c.request.method);

      expect(methods).toContain('GET');
      expect(methods).toContain('POST');
      expect(methods).toContain('PUT');
      expect(methods).toContain('DELETE');
    });
  });

  describe('Checkpoint Operations', () => {
    it('should create checkpoint with current captured state', async () => {
      // Make some requests
      await fetch('https://api.example.com/users');
      await fetch('https://api.example.com/users/1');

      // Wait for captures
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Create checkpoint
      const checkpoint = server.mockchain.checkpoint('Initial State', 'After loading users');

      expect(checkpoint.name).toBe('Initial State');
      expect(checkpoint.description).toBe('After loading users');
      expect(checkpoint.captures.length).toBeGreaterThanOrEqual(2);
    });

    it('should save captured state at checkpoint time', async () => {
      const store = server.mockchain.getStore();

      // Make initial requests
      await fetch('https://api.example.com/users');
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Create checkpoint
      const checkpoint = server.mockchain.checkpoint('Checkpoint 1');
      const capturesAtCheckpoint = checkpoint.captures.length;

      // Make more requests after checkpoint
      await fetch('https://api.example.com/users/1');
      await fetch('https://api.example.com/users/2');
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Checkpoint should still have original count
      const storedCheckpoint = store.getCheckpoint(checkpoint.id);
      expect(storedCheckpoint?.captures.length).toBe(capturesAtCheckpoint);

      // Current captures should have more
      expect(store.getCaptures().length).toBeGreaterThan(capturesAtCheckpoint);
    });
  });

  describe('Restore Operations', () => {
    it('should restore to checkpoint state', async () => {
      const store = server.mockchain.getStore();

      // Make initial request
      await fetch('https://api.example.com/users');
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Create checkpoint
      const checkpoint = server.mockchain.checkpoint('Restore Point');
      const capturesAtCheckpoint = store.getCaptures().length;

      // Make more requests
      await fetch('https://api.example.com/users/1');
      await fetch('https://api.example.com/users/2');
      await fetch('https://api.example.com/users/3');
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Should have more captures now
      expect(store.getCaptures().length).toBeGreaterThan(capturesAtCheckpoint);

      // Restore to checkpoint
      server.mockchain.restore(checkpoint.id);

      // Should have same number of captures as at checkpoint
      expect(store.getCaptures().length).toBe(capturesAtCheckpoint);
    });

    it('should allow making new requests after restore', async () => {
      const store = server.mockchain.getStore();

      // Initial state
      await fetch('https://api.example.com/users');
      await new Promise((resolve) => setTimeout(resolve, 50));

      const checkpoint = server.mockchain.checkpoint('Before Changes');

      // Make changes
      await fetch('https://api.example.com/users/1');
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Restore
      server.mockchain.restore(checkpoint.id);
      const countAfterRestore = store.getCaptures().length;

      // Make new requests after restore
      await fetch('https://api.example.com/users/2');
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Should capture the new request
      expect(store.getCaptures().length).toBeGreaterThan(countAfterRestore);
    });
  });

  describe('Multiple Handlers Working Together', () => {
    it('should capture requests to different endpoints', async () => {
      const store = server.mockchain.getStore();

      // Clear any previous captures
      store.clearCaptures();

      // List users
      const listResponse = await fetch('https://api.example.com/users');
      expect(listResponse.status).toBe(200);

      // Get single user
      const getResponse = await fetch('https://api.example.com/users/1');
      expect(getResponse.status).toBe(200);

      // Create user
      const createResponse = await fetch('https://api.example.com/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Alice' }),
      });
      expect(createResponse.status).toBe(201);

      // Wait for captures
      await new Promise((resolve) => setTimeout(resolve, 100));

      const captures = store.getCaptures();
      expect(captures.length).toBe(3);

      // Verify each request was captured correctly
      const listCapture = captures.find(
        (c) => c.request.url === 'https://api.example.com/users' && c.request.method === 'GET'
      );
      expect(listCapture?.response.body).toEqual([
        { id: 1, name: 'John Doe' },
        { id: 2, name: 'Jane Doe' },
      ]);

      const getCapture = captures.find(
        (c) => c.request.url.includes('/users/1') && c.request.method === 'GET'
      );
      expect(getCapture?.response.body).toEqual({ id: 1, name: 'User 1' });

      const createCapture = captures.find(
        (c) => c.request.url === 'https://api.example.com/users' && c.request.method === 'POST'
      );
      expect(createCapture?.response.body).toEqual({ id: 3, name: 'Alice' });
    });
  });

  describe('Timeline/Branch Operations', () => {
    it('should create a branch from current state', async () => {
      const store = server.mockchain.getStore();

      // Make some requests
      await fetch('https://api.example.com/users');
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Create branch
      const branch = server.mockchain.branch('Feature Branch');

      expect(branch.name).toBe('Feature Branch');
      expect(branch.parentId).toBe('main');
      expect(store.getCurrentTimeline().id).toBe(branch.id);
    });

    it('should create a branch from checkpoint', async () => {
      const store = server.mockchain.getStore();

      // Initial requests
      await fetch('https://api.example.com/users');
      await new Promise((resolve) => setTimeout(resolve, 50));

      const checkpoint = server.mockchain.checkpoint('Branch Point');

      // More requests
      await fetch('https://api.example.com/users/1');
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Create branch from checkpoint
      const branch = server.mockchain.branch('From Checkpoint', checkpoint.id);

      expect(branch.branchedFromCheckpointId).toBe(checkpoint.id);
      expect(store.getCaptures().length).toBe(checkpoint.captures.length);
    });

    it('should switch between timelines', async () => {
      const store = server.mockchain.getStore();

      // Work on main timeline
      await fetch('https://api.example.com/users');
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Create and switch to branch
      const branch = server.mockchain.branch('Test Branch');
      expect(store.getCurrentTimeline().id).toBe(branch.id);

      // Switch back to main
      server.mockchain.switchTimeline('main');
      expect(store.getCurrentTimeline().id).toBe('main');
    });
  });

  describe('Response Metadata', () => {
    it('should capture response headers', async () => {
      const store = server.mockchain.getStore();

      await fetch('https://api.example.com/users');
      await new Promise((resolve) => setTimeout(resolve, 50));

      const capture = store.getCaptures()[0];
      expect(capture?.response.headers).toBeDefined();
      expect(capture?.response.headers['content-type']).toContain('application/json');
    });

    it('should track response time', async () => {
      const store = server.mockchain.getStore();

      await fetch('https://api.example.com/users');
      await new Promise((resolve) => setTimeout(resolve, 50));

      const capture = store.getCaptures()[0];
      expect(capture?.response.responseTime).toBeDefined();
      expect(typeof capture?.response.responseTime).toBe('number');
      expect(capture?.response.responseTime).toBeGreaterThanOrEqual(0);
    });
  });
});

// Note: Options tests (autoCapture: false, exclude patterns) require separate MSW servers
// which can't run in the same process. These options are tested in unit tests for the
// helper functions (shouldExclude, etc.) and the wrapper initialization.
