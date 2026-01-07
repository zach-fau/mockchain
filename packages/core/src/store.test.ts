import { describe, it, expect, beforeEach } from 'vitest';
import {
  createMockChainStore,
  getMockChainStore,
  resetMockChainStore,
  type MockChainStore,
} from './store';
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

describe('MockChainStore', () => {
  let store: MockChainStore;

  beforeEach(() => {
    store = createMockChainStore();
  });

  describe('Initial State', () => {
    it('should start with main timeline as current', () => {
      expect(store.state.currentTimelineId).toBe('main');
    });

    it('should have main timeline in timelines map', () => {
      const timeline = store.state.timelines.get('main');
      expect(timeline).toBeDefined();
      expect(timeline?.name).toBe('Main');
      expect(timeline?.parentId).toBeNull();
    });

    it('should start with empty checkpoints', () => {
      expect(store.state.checkpoints.size).toBe(0);
    });

    it('should start with empty captures', () => {
      expect(store.state.currentCaptures).toHaveLength(0);
    });
  });

  describe('Capture Management', () => {
    it('should capture a request/response pair', () => {
      const capture = createMockCapture();
      store.capture(capture);

      expect(store.getCaptures()).toHaveLength(1);
      expect(store.getCaptures()[0]).toEqual(capture);
    });

    it('should accumulate multiple captures', () => {
      const capture1 = createMockCapture('GET', '/api/users');
      const capture2 = createMockCapture('POST', '/api/users');
      const capture3 = createMockCapture('DELETE', '/api/users/1');

      store.capture(capture1);
      store.capture(capture2);
      store.capture(capture3);

      expect(store.getCaptures()).toHaveLength(3);
    });

    it('should clear all captures', () => {
      store.capture(createMockCapture());
      store.capture(createMockCapture());
      expect(store.getCaptures()).toHaveLength(2);

      store.clearCaptures();
      expect(store.getCaptures()).toHaveLength(0);
    });

    it('should find capture by method and URL', () => {
      const capture1 = createMockCapture('GET', '/api/users');
      const capture2 = createMockCapture('POST', '/api/users');

      store.capture(capture1);
      store.capture(capture2);

      const found = store.findCapture('GET', '/api/users');
      expect(found).toBeDefined();
      expect(found?.request.method).toBe('GET');
    });

    it('should return undefined for non-existent capture', () => {
      store.capture(createMockCapture('GET', '/api/users'));

      const found = store.findCapture('DELETE', '/api/nonexistent');
      expect(found).toBeUndefined();
    });

    it('should return most recent capture when duplicates exist', () => {
      const capture1 = createMockCapture('GET', '/api/users');
      capture1.response.body = { data: 'first' };

      const capture2 = createMockCapture('GET', '/api/users');
      capture2.response.body = { data: 'second' };

      store.capture(capture1);
      store.capture(capture2);

      const found = store.findCapture('GET', '/api/users');
      expect(found?.response.body).toEqual({ data: 'second' });
    });
  });

  describe('Checkpoint Management', () => {
    it('should create a checkpoint with current captures', () => {
      store.capture(createMockCapture('GET', '/api/test'));
      store.capture(createMockCapture('POST', '/api/test'));

      const checkpoint = store.createCheckpoint({
        name: 'Test Checkpoint',
        description: 'A test checkpoint',
      });

      expect(checkpoint.name).toBe('Test Checkpoint');
      expect(checkpoint.description).toBe('A test checkpoint');
      expect(checkpoint.captures).toHaveLength(2);
      expect(checkpoint.timelineId).toBe('main');
      expect(checkpoint.id).toBeDefined();
      expect(checkpoint.createdAt).toBeLessThanOrEqual(Date.now());
    });

    it('should store checkpoint in state', () => {
      const checkpoint = store.createCheckpoint({ name: 'Stored Checkpoint' });

      expect(store.state.checkpoints.has(checkpoint.id)).toBe(true);
      expect(store.getCheckpoint(checkpoint.id)).toEqual(checkpoint);
    });

    it('should restore checkpoint and update current captures', () => {
      store.capture(createMockCapture('GET', '/api/original'));
      const checkpoint = store.createCheckpoint({ name: 'Restore Point' });

      // Add more captures after checkpoint
      store.capture(createMockCapture('POST', '/api/new'));
      store.capture(createMockCapture('DELETE', '/api/another'));
      expect(store.getCaptures()).toHaveLength(3);

      // Restore to checkpoint
      store.restoreCheckpoint(checkpoint.id);

      expect(store.getCaptures()).toHaveLength(1);
      expect(store.getCaptures()[0]?.request.url).toBe('/api/original');
    });

    it('should throw error when restoring non-existent checkpoint', () => {
      expect(() => {
        store.restoreCheckpoint('non-existent-id');
      }).toThrow('Checkpoint "non-existent-id" not found');
    });

    it('should delete checkpoint', () => {
      const checkpoint = store.createCheckpoint({ name: 'To Delete' });
      expect(store.getCheckpoint(checkpoint.id)).toBeDefined();

      store.deleteCheckpoint(checkpoint.id);
      expect(store.getCheckpoint(checkpoint.id)).toBeUndefined();
    });

    it('should list all checkpoints', () => {
      store.createCheckpoint({ name: 'Checkpoint 1' });
      store.createCheckpoint({ name: 'Checkpoint 2' });
      store.createCheckpoint({ name: 'Checkpoint 3' });

      const checkpoints = store.listCheckpoints();
      expect(checkpoints).toHaveLength(3);
    });

    it('should list checkpoints filtered by timeline', () => {
      store.createCheckpoint({ name: 'Main Checkpoint' });

      const branch = store.createBranch({ name: 'Feature Branch' });
      store.createCheckpoint({ name: 'Branch Checkpoint' });

      const mainCheckpoints = store.listCheckpoints('main');
      expect(mainCheckpoints).toHaveLength(1);
      expect(mainCheckpoints[0]?.name).toBe('Main Checkpoint');

      const branchCheckpoints = store.listCheckpoints(branch.id);
      expect(branchCheckpoints).toHaveLength(1);
      expect(branchCheckpoints[0]?.name).toBe('Branch Checkpoint');
    });

    it('should create checkpoint with snapshot of captures (not reference)', () => {
      const capture = createMockCapture();
      store.capture(capture);
      const checkpoint = store.createCheckpoint({ name: 'Snapshot Test' });

      // Modify captures after checkpoint
      store.clearCaptures();
      store.capture(createMockCapture('PUT', '/different'));

      // Checkpoint captures should be unchanged
      expect(checkpoint.captures).toHaveLength(1);
      expect(checkpoint.captures[0]?.request.url).toBe('/api/test');
    });
  });

  describe('Timeline/Branch Management', () => {
    it('should create a branch from current state', () => {
      store.capture(createMockCapture());
      const branch = store.createBranch({ name: 'Feature Branch' });

      expect(branch.name).toBe('Feature Branch');
      expect(branch.parentId).toBe('main');
      expect(branch.branchedFromCheckpointId).toBeNull();
    });

    it('should switch to new branch after creation', () => {
      const branch = store.createBranch({ name: 'New Branch' });

      expect(store.state.currentTimelineId).toBe(branch.id);
      expect(store.getCurrentTimeline().name).toBe('New Branch');
    });

    it('should carry over captures to new branch', () => {
      store.capture(createMockCapture('GET', '/api/carried'));
      store.capture(createMockCapture('POST', '/api/carried'));

      store.createBranch({ name: 'Branch with Captures' });

      expect(store.getCaptures()).toHaveLength(2);
    });

    it('should create branch from checkpoint', () => {
      store.capture(createMockCapture('GET', '/api/checkpoint-capture'));
      const checkpoint = store.createCheckpoint({ name: 'Branch Point' });

      // Add more captures
      store.capture(createMockCapture('POST', '/api/new'));

      // Create branch from checkpoint
      const branch = store.createBranch({
        name: 'From Checkpoint',
        fromCheckpointId: checkpoint.id,
      });

      expect(branch.branchedFromCheckpointId).toBe(checkpoint.id);
      // Should have only the captures from checkpoint time
      expect(store.getCaptures()).toHaveLength(1);
      expect(store.getCaptures()[0]?.request.url).toBe('/api/checkpoint-capture');
    });

    it('should throw error when branching from non-existent checkpoint', () => {
      expect(() =>
        store.createBranch({
          name: 'Bad Branch',
          fromCheckpointId: 'non-existent',
        })
      ).toThrow('Checkpoint "non-existent" not found');
    });

    it('should switch between timelines', () => {
      const branch = store.createBranch({ name: 'Switch Test' });
      expect(store.state.currentTimelineId).toBe(branch.id);

      store.switchTimeline('main');
      expect(store.state.currentTimelineId).toBe('main');
    });

    it('should clear captures when switching timelines', () => {
      store.capture(createMockCapture());
      store.createBranch({ name: 'Clear Test' });
      expect(store.getCaptures()).toHaveLength(1);

      store.switchTimeline('main');
      expect(store.getCaptures()).toHaveLength(0);
    });

    it('should throw error when switching to non-existent timeline', () => {
      expect(() => {
        store.switchTimeline('non-existent');
      }).toThrow('Timeline "non-existent" not found');
    });

    it('should delete timeline', () => {
      const branch = store.createBranch({ name: 'To Delete' });
      expect(store.state.timelines.has(branch.id)).toBe(true);

      store.deleteTimeline(branch.id);
      expect(store.state.timelines.has(branch.id)).toBe(false);
    });

    it('should not allow deleting main timeline', () => {
      expect(() => {
        store.deleteTimeline('main');
      }).toThrow('Cannot delete main timeline');
    });

    it('should switch to main when deleting current timeline', () => {
      const branch = store.createBranch({ name: 'Current to Delete' });
      expect(store.state.currentTimelineId).toBe(branch.id);

      store.deleteTimeline(branch.id);
      expect(store.state.currentTimelineId).toBe('main');
    });

    it('should delete checkpoints when deleting timeline', () => {
      store.createBranch({ name: 'With Checkpoints' });
      const cp1 = store.createCheckpoint({ name: 'Branch CP 1' });
      const cp2 = store.createCheckpoint({ name: 'Branch CP 2' });

      const branchId = store.state.currentTimelineId;
      store.deleteTimeline(branchId);

      expect(store.getCheckpoint(cp1.id)).toBeUndefined();
      expect(store.getCheckpoint(cp2.id)).toBeUndefined();
    });

    it('should throw error when deleting non-existent timeline', () => {
      expect(() => {
        store.deleteTimeline('non-existent');
      }).toThrow('Timeline "non-existent" not found');
    });

    it('should list all timelines', () => {
      store.createBranch({ name: 'Branch 1' });
      store.createBranch({ name: 'Branch 2' });

      const timelines = store.listTimelines();
      expect(timelines).toHaveLength(3); // main + 2 branches
      expect(timelines.map((t) => t.name)).toContain('Main');
      expect(timelines.map((t) => t.name)).toContain('Branch 1');
      expect(timelines.map((t) => t.name)).toContain('Branch 2');
    });

    it('should get current timeline', () => {
      const current = store.getCurrentTimeline();
      expect(current.id).toBe('main');
      expect(current.name).toBe('Main');
    });
  });

  describe('State Isolation', () => {
    it('should not share state between different store instances', () => {
      const store1 = createMockChainStore();
      const store2 = createMockChainStore();

      store1.capture(createMockCapture());
      store1.createBranch({ name: 'Store 1 Branch' });

      expect(store1.getCaptures()).toHaveLength(1);
      expect(store1.listTimelines()).toHaveLength(2);

      expect(store2.getCaptures()).toHaveLength(0);
      expect(store2.listTimelines()).toHaveLength(1);
    });
  });

  describe('Checkpoint Restoration with Timeline', () => {
    it('should switch to checkpoint timeline when restoring', () => {
      // Create checkpoint on main
      store.capture(createMockCapture());
      const mainCheckpoint = store.createCheckpoint({ name: 'Main CP' });

      // Create branch and add captures there
      store.createBranch({ name: 'Branch' });
      store.capture(createMockCapture('POST', '/branch'));

      // Restore main checkpoint - should switch back to main timeline
      store.restoreCheckpoint(mainCheckpoint.id);

      expect(store.state.currentTimelineId).toBe('main');
    });
  });
});

describe('Singleton Store', () => {
  beforeEach(() => {
    resetMockChainStore();
  });

  it('should return same instance with getMockChainStore', () => {
    const store1 = getMockChainStore();
    const store2 = getMockChainStore();

    expect(store1).toBe(store2);
  });

  it('should reset singleton with resetMockChainStore', () => {
    const store1 = getMockChainStore();
    store1.capture(createMockCapture());

    resetMockChainStore();

    const store2 = getMockChainStore();
    expect(store2.getCaptures()).toHaveLength(0);
    expect(store1).not.toBe(store2);
  });
});
