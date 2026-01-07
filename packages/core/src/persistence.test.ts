import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import 'fake-indexeddb/auto';
import {
  createPersistentMockChainStore,
  getPersistentMockChainStore,
  resetPersistentMockChainStore,
  type PersistentMockChainStore,
} from './store';
import { createMemoryStorage } from './storage';
import type { CapturedPair } from './types';

// Helper to create a mock captured pair
function createMockCapture(method = 'GET', url = '/api/test', status = 200): CapturedPair {
  return {
    request: {
      id: `req-${String(Date.now())}-${String(Math.random())}`,
      method,
      url,
      headers: { 'content-type': 'application/json' },
      body: undefined,
      timestamp: Date.now(),
    },
    response: {
      status,
      headers: { 'content-type': 'application/json' },
      body: { data: 'test' },
      responseTime: 50,
    },
  };
}

// Create a shared memory storage that persists between store instances
function createSharedMemoryStorage() {
  const data = new Map<string, string>();
  return {
    storage: {
      getItem: (name: string): string | null => data.get(name) ?? null,
      setItem: (name: string, value: string): void => {
        data.set(name, value);
      },
      removeItem: (name: string) => {
        data.delete(name);
      },
    },
    getData: () => data,
    clear: () => {
      data.clear();
    },
  };
}

describe('Persistent MockChain Store', () => {
  let store: PersistentMockChainStore;

  beforeEach(() => {
    // Use memory storage for tests to avoid IndexedDB complexity
    store = createPersistentMockChainStore({
      storage: createMemoryStorage(),
      storageKey: `test-${String(Date.now())}`,
    });
  });

  describe('Basic Functionality', () => {
    it('should have same API as non-persistent store', () => {
      // Verify all MockChainStore methods exist
      expect(typeof store.capture).toBe('function');
      expect(typeof store.clearCaptures).toBe('function');
      expect(typeof store.createCheckpoint).toBe('function');
      expect(typeof store.restoreCheckpoint).toBe('function');
      expect(typeof store.deleteCheckpoint).toBe('function');
      expect(typeof store.getCheckpoint).toBe('function');
      expect(typeof store.listCheckpoints).toBe('function');
      expect(typeof store.createBranch).toBe('function');
      expect(typeof store.switchTimeline).toBe('function');
      expect(typeof store.deleteTimeline).toBe('function');
      expect(typeof store.getCurrentTimeline).toBe('function');
      expect(typeof store.listTimelines).toBe('function');
      expect(typeof store.getCaptures).toBe('function');
      expect(typeof store.findCapture).toBe('function');

      // Verify persistence-specific methods
      expect(typeof store.clearPersistedState).toBe('function');
      expect(typeof store.isHydrated).toBe('function');
      expect(typeof store.waitForHydration).toBe('function');
    });

    it('should start with main timeline', () => {
      expect(store.state.currentTimelineId).toBe('main');
      expect(store.getCurrentTimeline().name).toBe('Main');
    });

    it('should capture and create checkpoints', () => {
      store.capture(createMockCapture());
      const checkpoint = store.createCheckpoint({ name: 'Test CP' });

      expect(checkpoint.name).toBe('Test CP');
      expect(checkpoint.captures).toHaveLength(1);
    });
  });

  describe('Hydration', () => {
    it('should track hydration state', async () => {
      // With memory storage, hydration is synchronous
      await store.waitForHydration();
      expect(store.isHydrated()).toBe(true);
    });

    it('should resolve waitForHydration promise', async () => {
      // Should resolve without error
      await expect(store.waitForHydration()).resolves.toBeUndefined();
    });
  });

  describe('Clear Persisted State', () => {
    it('should reset state when clearing persisted data', async () => {
      // Add some data
      store.capture(createMockCapture());
      store.createCheckpoint({ name: 'Test' });
      store.createBranch({ name: 'Test Branch' });

      expect(store.getCaptures()).toHaveLength(1);
      expect(store.listCheckpoints()).toHaveLength(1);
      expect(store.listTimelines()).toHaveLength(2);

      // Clear persisted state
      await store.clearPersistedState();

      // State should be reset to initial
      expect(store.getCaptures()).toHaveLength(0);
      expect(store.listCheckpoints()).toHaveLength(0);
      expect(store.listTimelines()).toHaveLength(1);
      expect(store.state.currentTimelineId).toBe('main');
    });
  });
});

describe('Persistence Across Store Instances', () => {
  let sharedStorage: ReturnType<typeof createSharedMemoryStorage>;
  const storageKey = 'shared-test-state';

  beforeEach(() => {
    sharedStorage = createSharedMemoryStorage();
  });

  afterEach(() => {
    sharedStorage.clear();
  });

  it('should persist state to storage', async () => {
    const store = createPersistentMockChainStore({
      storage: sharedStorage.storage,
      storageKey,
    });

    await store.waitForHydration();

    // Create some data
    store.capture(createMockCapture('GET', '/api/users'));
    store.createCheckpoint({ name: 'Persisted Checkpoint' });

    // Allow time for async persistence
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Verify data was written to storage
    const storedData = sharedStorage.getData().get(storageKey);
    expect(storedData).toBeDefined();

    // Parse and verify structure
    const parsed = JSON.parse(storedData ?? '{}') as {
      state: {
        checkpoints: [string, { name: string }][];
      };
    };
    expect(parsed.state).toBeDefined();
    expect(parsed.state.checkpoints).toHaveLength(1);
    expect(parsed.state.checkpoints[0][1].name).toBe('Persisted Checkpoint');
  });

  it('should restore state from storage on new instance', async () => {
    // First store: create and persist data
    const store1 = createPersistentMockChainStore({
      storage: sharedStorage.storage,
      storageKey,
    });

    await store1.waitForHydration();

    store1.capture(createMockCapture('POST', '/api/items'));
    const checkpoint = store1.createCheckpoint({
      name: 'Recoverable Checkpoint',
      description: 'Should survive restart',
    });

    // Allow persistence to complete
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Second store: should load persisted data
    const store2 = createPersistentMockChainStore({
      storage: sharedStorage.storage,
      storageKey,
    });

    await store2.waitForHydration();

    // Verify restored state
    const restoredCheckpoints = store2.listCheckpoints();
    expect(restoredCheckpoints).toHaveLength(1);
    expect(restoredCheckpoints[0]?.name).toBe('Recoverable Checkpoint');
    expect(restoredCheckpoints[0]?.description).toBe('Should survive restart');
    expect(restoredCheckpoints[0]?.id).toBe(checkpoint.id);
  });

  it('should persist timelines and branches', async () => {
    const store1 = createPersistentMockChainStore({
      storage: sharedStorage.storage,
      storageKey,
    });

    await store1.waitForHydration();

    // Create branch
    const branch = store1.createBranch({ name: 'Feature Branch' });

    // Allow persistence
    await new Promise((resolve) => setTimeout(resolve, 50));

    // New store should have the branch
    const store2 = createPersistentMockChainStore({
      storage: sharedStorage.storage,
      storageKey,
    });

    await store2.waitForHydration();

    const timelines = store2.listTimelines();
    expect(timelines).toHaveLength(2);
    expect(timelines.map((t) => t.name)).toContain('Feature Branch');
    expect(timelines.find((t) => t.name === 'Feature Branch')?.id).toBe(branch.id);
  });

  it('should persist captures within checkpoints', async () => {
    const store1 = createPersistentMockChainStore({
      storage: sharedStorage.storage,
      storageKey,
    });

    await store1.waitForHydration();

    // Create captures and checkpoint
    store1.capture(createMockCapture('GET', '/api/users'));
    store1.capture(createMockCapture('POST', '/api/users'));
    store1.capture(createMockCapture('DELETE', '/api/users/1'));
    store1.createCheckpoint({ name: 'Multi-Capture Checkpoint' });

    // Allow persistence
    await new Promise((resolve) => setTimeout(resolve, 50));

    // New store
    const store2 = createPersistentMockChainStore({
      storage: sharedStorage.storage,
      storageKey,
    });

    await store2.waitForHydration();

    const checkpoint = store2.listCheckpoints()[0];
    expect(checkpoint?.captures).toHaveLength(3);
    expect(checkpoint?.captures[0]?.request.method).toBe('GET');
    expect(checkpoint?.captures[1]?.request.method).toBe('POST');
    expect(checkpoint?.captures[2]?.request.method).toBe('DELETE');
  });

  it('should clear storage and reset on clearPersistedState', async () => {
    const store1 = createPersistentMockChainStore({
      storage: sharedStorage.storage,
      storageKey,
    });

    await store1.waitForHydration();

    // Create data
    store1.capture(createMockCapture());
    store1.createCheckpoint({ name: 'To Be Cleared' });

    // Allow persistence
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Clear persisted state
    await store1.clearPersistedState();

    // New store should start fresh
    const store2 = createPersistentMockChainStore({
      storage: sharedStorage.storage,
      storageKey,
    });

    await store2.waitForHydration();

    expect(store2.listCheckpoints()).toHaveLength(0);
    expect(store2.getCaptures()).toHaveLength(0);
  });
});

describe('Singleton Persistent Store', () => {
  beforeEach(() => {
    resetPersistentMockChainStore();
  });

  afterEach(() => {
    resetPersistentMockChainStore();
  });

  it('should return same instance with getPersistentMockChainStore', () => {
    const store1 = getPersistentMockChainStore({
      storage: createMemoryStorage(),
    });
    const store2 = getPersistentMockChainStore();

    expect(store1).toBe(store2);
  });

  it('should reset singleton with resetPersistentMockChainStore', () => {
    const store1 = getPersistentMockChainStore({
      storage: createMemoryStorage(),
    });
    store1.capture(createMockCapture());

    resetPersistentMockChainStore();

    const store2 = getPersistentMockChainStore({
      storage: createMemoryStorage(),
    });
    expect(store2.getCaptures()).toHaveLength(0);
    expect(store1).not.toBe(store2);
  });
});

describe('Storage Fallback', () => {
  it('should use memory storage when IndexedDB is unavailable', () => {
    // Save original
    const originalIndexedDB = globalThis.indexedDB;

    // Temporarily remove indexedDB
    // @ts-expect-error - Testing unavailable IndexedDB
    globalThis.indexedDB = undefined;

    // Create store without explicit storage - should fall back to memory
    const store = createPersistentMockChainStore({
      storageKey: 'fallback-test',
    });

    // Should work normally
    store.capture(createMockCapture());
    expect(store.getCaptures()).toHaveLength(1);

    // Restore indexedDB
    globalThis.indexedDB = originalIndexedDB;
  });
});

describe('Custom Storage Options', () => {
  it('should use custom storage key', async () => {
    const sharedStorage = createSharedMemoryStorage();
    const customKey = 'my-custom-key';

    const store = createPersistentMockChainStore({
      storage: sharedStorage.storage,
      storageKey: customKey,
    });

    await store.waitForHydration();
    store.capture(createMockCapture());

    // Allow persistence
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Data should be stored under custom key
    expect(sharedStorage.getData().has(customKey)).toBe(true);
    expect(sharedStorage.getData().has('mockchain-state')).toBe(false);
  });
});

describe('Map Serialization Integrity', () => {
  it('should correctly serialize and deserialize Map with multiple entries', async () => {
    const sharedStorage = createSharedMemoryStorage();
    const storageKey = 'map-test';

    const store1 = createPersistentMockChainStore({
      storage: sharedStorage.storage,
      storageKey,
    });

    await store1.waitForHydration();

    // Create multiple checkpoints and branches
    store1.createCheckpoint({ name: 'CP 1' });
    store1.createCheckpoint({ name: 'CP 2' });
    store1.createBranch({ name: 'Branch A' });
    store1.createCheckpoint({ name: 'CP 3' });
    store1.createBranch({ name: 'Branch B' });

    // Allow persistence
    await new Promise((resolve) => setTimeout(resolve, 50));

    // New store
    const store2 = createPersistentMockChainStore({
      storage: sharedStorage.storage,
      storageKey,
    });

    await store2.waitForHydration();

    // Verify all data restored
    expect(store2.listCheckpoints()).toHaveLength(3);
    expect(store2.listTimelines()).toHaveLength(3); // main + 2 branches

    // Verify Maps work correctly
    expect(store2.state.timelines instanceof Map).toBe(true);
    expect(store2.state.checkpoints instanceof Map).toBe(true);
  });
});
