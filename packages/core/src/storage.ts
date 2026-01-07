import { get, set, del, createStore } from 'idb-keyval';
import type { StateStorage } from 'zustand/middleware';
import type { MockChainState, Timeline, Checkpoint } from './types';

/**
 * Serialized version of MockChainState for storage
 * Maps are converted to arrays of [key, value] tuples
 */
export interface SerializedMockChainState {
  currentTimelineId: string;
  timelines: [string, Timeline][];
  checkpoints: [string, Checkpoint][];
  currentCaptures: MockChainState['currentCaptures'];
}

/**
 * Serialize MockChainState for storage (converts Maps to arrays)
 */
export function serializeState(state: MockChainState): SerializedMockChainState {
  return {
    currentTimelineId: state.currentTimelineId,
    timelines: Array.from(state.timelines.entries()),
    checkpoints: Array.from(state.checkpoints.entries()),
    currentCaptures: state.currentCaptures,
  };
}

/**
 * Deserialize stored state back to MockChainState (converts arrays back to Maps)
 */
export function deserializeState(serialized: SerializedMockChainState): MockChainState {
  return {
    currentTimelineId: serialized.currentTimelineId,
    timelines: new Map(serialized.timelines),
    checkpoints: new Map(serialized.checkpoints),
    currentCaptures: serialized.currentCaptures,
  };
}

/**
 * Check if IndexedDB is available in the current environment
 */
export function isIndexedDBAvailable(): boolean {
  try {
    // Check if indexedDB exists and is functional
    if (typeof indexedDB === 'undefined') {
      return false;
    }
    // Try to access it - this can fail in some contexts (e.g., private browsing)
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    return indexedDB !== null;
  } catch {
    return false;
  }
}

/**
 * Configuration options for IndexedDB storage
 */
export interface IndexedDBStorageOptions {
  /** Database name for IndexedDB (default: 'mockchain-db') */
  dbName?: string;
  /** Store name within the database (default: 'mockchain-store') */
  storeName?: string;
}

/**
 * Create an IndexedDB-backed StateStorage for Zustand's persist middleware
 */
export function createIndexedDBStorage(options: IndexedDBStorageOptions = {}): StateStorage {
  const { dbName = 'mockchain-db', storeName = 'mockchain-store' } = options;

  // Create a custom idb-keyval store for isolation
  const customStore = createStore(dbName, storeName);

  return {
    getItem: async (name: string): Promise<string | null> => {
      try {
        const value = await get<string>(name, customStore);
        return value ?? null;
      } catch (error) {
        console.warn('[MockChain] Failed to read from IndexedDB:', error);
        return null;
      }
    },

    setItem: async (name: string, value: string): Promise<void> => {
      try {
        await set(name, value, customStore);
      } catch (error) {
        console.warn('[MockChain] Failed to write to IndexedDB:', error);
      }
    },

    removeItem: async (name: string): Promise<void> => {
      try {
        await del(name, customStore);
      } catch (error) {
        console.warn('[MockChain] Failed to remove from IndexedDB:', error);
      }
    },
  };
}

/**
 * Create an in-memory storage (for testing or when IndexedDB is unavailable)
 */
export function createMemoryStorage(): StateStorage {
  const storage = new Map<string, string>();

  return {
    getItem: (name: string): string | null => {
      return storage.get(name) ?? null;
    },

    setItem: (name: string, value: string): void => {
      storage.set(name, value);
    },

    removeItem: (name: string): void => {
      storage.delete(name);
    },
  };
}

/**
 * Default storage key used for persisted state
 */
export const STORAGE_KEY = 'mockchain-state';
