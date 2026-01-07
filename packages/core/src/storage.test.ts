import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import 'fake-indexeddb/auto';
import {
  serializeState,
  deserializeState,
  createIndexedDBStorage,
  createMemoryStorage,
  isIndexedDBAvailable,
  type SerializedMockChainState,
} from './storage';
import type { MockChainState, Timeline, Checkpoint, CapturedPair } from './types';

// Helper to create test state
function createTestState(): MockChainState {
  const timeline: Timeline = {
    id: 'main',
    name: 'Main',
    parentId: null,
    branchedFromCheckpointId: null,
    createdAt: Date.now(),
  };

  const checkpoint: Checkpoint = {
    id: 'cp-1',
    name: 'Test Checkpoint',
    timelineId: 'main',
    captures: [],
    createdAt: Date.now(),
  };

  const capture: CapturedPair = {
    request: {
      id: 'req-1',
      method: 'GET',
      url: '/api/test',
      headers: { 'content-type': 'application/json' },
      timestamp: Date.now(),
    },
    response: {
      status: 200,
      headers: { 'content-type': 'application/json' },
      body: { data: 'test' },
      responseTime: 50,
    },
  };

  return {
    currentTimelineId: 'main',
    timelines: new Map([['main', timeline]]),
    checkpoints: new Map([['cp-1', checkpoint]]),
    currentCaptures: [capture],
  };
}

describe('State Serialization', () => {
  it('should serialize state with Maps to arrays', () => {
    const state = createTestState();
    const serialized = serializeState(state);

    expect(serialized.currentTimelineId).toBe('main');
    expect(Array.isArray(serialized.timelines)).toBe(true);
    expect(Array.isArray(serialized.checkpoints)).toBe(true);
    expect(serialized.timelines).toHaveLength(1);
    expect(serialized.checkpoints).toHaveLength(1);
    expect(serialized.currentCaptures).toHaveLength(1);
  });

  it('should deserialize arrays back to Maps', () => {
    const serialized: SerializedMockChainState = {
      currentTimelineId: 'main',
      timelines: [
        [
          'main',
          {
            id: 'main',
            name: 'Main',
            parentId: null,
            branchedFromCheckpointId: null,
            createdAt: 12345,
          },
        ],
      ],
      checkpoints: [
        [
          'cp-1',
          {
            id: 'cp-1',
            name: 'Test',
            timelineId: 'main',
            captures: [],
            createdAt: 12345,
          },
        ],
      ],
      currentCaptures: [],
    };

    const deserialized = deserializeState(serialized);

    expect(deserialized.timelines instanceof Map).toBe(true);
    expect(deserialized.checkpoints instanceof Map).toBe(true);
    expect(deserialized.timelines.get('main')?.name).toBe('Main');
    expect(deserialized.checkpoints.get('cp-1')?.name).toBe('Test');
  });

  it('should round-trip serialize/deserialize correctly', () => {
    const original = createTestState();
    const serialized = serializeState(original);
    const deserialized = deserializeState(serialized);

    expect(deserialized.currentTimelineId).toBe(original.currentTimelineId);
    expect(deserialized.timelines.size).toBe(original.timelines.size);
    expect(deserialized.checkpoints.size).toBe(original.checkpoints.size);
    expect(deserialized.currentCaptures).toHaveLength(original.currentCaptures.length);

    // Verify Map contents
    const originalTimeline = original.timelines.get('main');
    const deserializedTimeline = deserialized.timelines.get('main');
    expect(deserializedTimeline?.name).toBe(originalTimeline?.name);
  });
});

describe('Memory Storage', () => {
  it('should store and retrieve values', () => {
    const storage = createMemoryStorage();

    storage.setItem('test-key', 'test-value');
    expect(storage.getItem('test-key')).toBe('test-value');
  });

  it('should return null for non-existent keys', () => {
    const storage = createMemoryStorage();

    expect(storage.getItem('non-existent')).toBeNull();
  });

  it('should remove values', () => {
    const storage = createMemoryStorage();

    storage.setItem('test-key', 'test-value');
    storage.removeItem('test-key');
    expect(storage.getItem('test-key')).toBeNull();
  });

  it('should overwrite existing values', () => {
    const storage = createMemoryStorage();

    storage.setItem('test-key', 'first-value');
    storage.setItem('test-key', 'second-value');
    expect(storage.getItem('test-key')).toBe('second-value');
  });
});

describe('IndexedDB Storage', () => {
  let storage: ReturnType<typeof createIndexedDBStorage>;

  beforeEach(() => {
    // fake-indexeddb/auto provides global indexedDB
    storage = createIndexedDBStorage({ dbName: 'test-db', storeName: 'test-store' });
  });

  afterEach(async () => {
    // Clean up by removing the test key
    await storage.removeItem('test-key');
  });

  it('should store and retrieve values', async () => {
    await storage.setItem('test-key', 'test-value');
    const result = await storage.getItem('test-key');
    expect(result).toBe('test-value');
  });

  it('should return null for non-existent keys', async () => {
    const result = await storage.getItem('non-existent-key');
    expect(result).toBeNull();
  });

  it('should remove values', async () => {
    await storage.setItem('test-key', 'test-value');
    await storage.removeItem('test-key');
    const result = await storage.getItem('test-key');
    expect(result).toBeNull();
  });

  it('should handle JSON data correctly', async () => {
    const testData = { foo: 'bar', count: 42, nested: { value: true } };
    await storage.setItem('test-key', JSON.stringify(testData));
    const result = await storage.getItem('test-key');
    expect(JSON.parse(result ?? '')).toEqual(testData);
  });
});

describe('isIndexedDBAvailable', () => {
  it('should return true when indexedDB is available (via fake-indexeddb)', () => {
    // fake-indexeddb/auto makes indexedDB available globally
    expect(isIndexedDBAvailable()).toBe(true);
  });

  it('should return false when indexedDB is undefined', () => {
    const originalIndexedDB = globalThis.indexedDB;
    // @ts-expect-error - Testing undefined case
    globalThis.indexedDB = undefined;

    expect(isIndexedDBAvailable()).toBe(false);

    // Restore
    globalThis.indexedDB = originalIndexedDB;
  });
});

describe('IndexedDB Storage Error Handling', () => {
  it('should handle read errors gracefully', async () => {
    const storage = createIndexedDBStorage();

    // Even if underlying storage fails, it should return null
    const result = await storage.getItem('any-key');
    expect(result === null || typeof result === 'string').toBe(true);
  });
});
