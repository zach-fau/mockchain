import { describe, it, expect, beforeEach } from 'vitest';
import { createMockChainStore, type MockChainStore, EXPORT_VERSION } from './store';
import type { CapturedPair, ExportData, Timeline, Checkpoint } from './types';

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

describe('Export/Import', () => {
  let store: MockChainStore;

  beforeEach(() => {
    store = createMockChainStore();
  });

  describe('exportState', () => {
    it('should produce valid JSON-serializable data', () => {
      store.capture(createMockCapture());
      store.createCheckpoint({ name: 'Test Checkpoint' });

      const exported = store.exportState();

      // Should be JSON-serializable
      const jsonString = JSON.stringify(exported);
      expect(jsonString).toBeDefined();

      // Should parse back to equivalent object
      const parsed = JSON.parse(jsonString) as ExportData;
      expect(parsed.version).toBe(exported.version);
      expect(parsed.timelines).toHaveLength(exported.timelines.length);
      expect(parsed.checkpoints).toHaveLength(exported.checkpoints.length);
      expect(parsed.captures).toHaveLength(exported.captures.length);
    });

    it('should include version field', () => {
      const exported = store.exportState();

      expect(exported.version).toBe(EXPORT_VERSION);
    });

    it('should include exportedAt timestamp', () => {
      const before = new Date().toISOString();
      const exported = store.exportState();
      const after = new Date().toISOString();

      expect(exported.exportedAt).toBeDefined();
      expect(exported.exportedAt >= before).toBe(true);
      expect(exported.exportedAt <= after).toBe(true);
    });

    it('should export all timelines by default', () => {
      store.createBranch({ name: 'Branch 1' });
      store.switchTimeline('main');
      store.createBranch({ name: 'Branch 2' });

      const exported = store.exportState();

      expect(exported.timelines).toHaveLength(3); // main + 2 branches
      expect(exported.timelines.map((t) => t.name)).toContain('Main');
      expect(exported.timelines.map((t) => t.name)).toContain('Branch 1');
      expect(exported.timelines.map((t) => t.name)).toContain('Branch 2');
    });

    it('should export all checkpoints by default', () => {
      store.createCheckpoint({ name: 'Checkpoint 1' });
      store.createBranch({ name: 'Branch' });
      store.createCheckpoint({ name: 'Checkpoint 2' });

      const exported = store.exportState();

      expect(exported.checkpoints).toHaveLength(2);
      expect(exported.checkpoints.map((c) => c.name)).toContain('Checkpoint 1');
      expect(exported.checkpoints.map((c) => c.name)).toContain('Checkpoint 2');
    });

    it('should export current captures', () => {
      store.capture(createMockCapture('GET', '/api/users'));
      store.capture(createMockCapture('POST', '/api/users'));

      const exported = store.exportState();

      expect(exported.captures).toHaveLength(2);
      expect(exported.captures[0]?.request.url).toBe('/api/users');
    });

    it('should export specific timeline only when specified', () => {
      store.capture(createMockCapture('GET', '/api/main'));
      store.createCheckpoint({ name: 'Main Checkpoint' });

      const branch = store.createBranch({ name: 'Feature Branch' });
      // Branch carries over captures from main, so clear first
      store.clearCaptures();
      store.capture(createMockCapture('POST', '/api/branch'));
      store.createCheckpoint({ name: 'Branch Checkpoint' });

      const exported = store.exportState({ timeline: branch.id });

      expect(exported.timelines).toHaveLength(1);
      expect(exported.timelines[0]?.name).toBe('Feature Branch');
      expect(exported.checkpoints).toHaveLength(1);
      expect(exported.checkpoints[0]?.name).toBe('Branch Checkpoint');
      // Should include current captures since we're on the branch timeline
      expect(exported.captures).toHaveLength(1);
    });

    it('should throw error when exporting non-existent timeline', () => {
      expect(() => store.exportState({ timeline: 'non-existent' })).toThrow(
        'Timeline "non-existent" not found'
      );
    });

    it('should export empty captures when exporting non-current timeline', () => {
      store.createBranch({ name: 'Branch' });
      store.capture(createMockCapture());

      // Switch to main and export branch (which is not current)
      store.switchTimeline('main');
      store.capture(createMockCapture('GET', '/api/main-capture'));

      const branchTimeline = store.listTimelines().find((t) => t.name === 'Branch');
      const exported = store.exportState({ timeline: branchTimeline?.id });

      // Should not include captures since branch is not current timeline
      expect(exported.captures).toHaveLength(0);
    });
  });

  describe('importState with replace strategy', () => {
    it('should replace all state with imported data', () => {
      // Create initial state
      store.capture(createMockCapture('GET', '/api/original'));
      store.createCheckpoint({ name: 'Original Checkpoint' });

      // Import new state
      const importData: ExportData = {
        version: EXPORT_VERSION,
        exportedAt: new Date().toISOString(),
        timelines: [
          {
            id: 'imported-timeline',
            name: 'Imported Timeline',
            parentId: null,
            branchedFromCheckpointId: null,
            createdAt: Date.now(),
          },
        ],
        checkpoints: [
          {
            id: 'imported-cp',
            name: 'Imported Checkpoint',
            timelineId: 'imported-timeline',
            captures: [],
            createdAt: Date.now(),
          },
        ],
        captures: [createMockCapture('POST', '/api/imported')],
      };

      store.importState(importData, { strategy: 'replace' });

      // Should have the imported data
      expect(store.listTimelines().some((t) => t.name === 'Imported Timeline')).toBe(true);
      expect(store.listCheckpoints().some((c) => c.name === 'Imported Checkpoint')).toBe(true);
      expect(store.getCaptures()).toHaveLength(1);
      expect(store.getCaptures()[0]?.request.url).toBe('/api/imported');

      // Original data should be gone
      expect(store.listCheckpoints().some((c) => c.name === 'Original Checkpoint')).toBe(false);
    });

    it('should ensure main timeline always exists after replace', () => {
      const importData: ExportData = {
        version: EXPORT_VERSION,
        exportedAt: new Date().toISOString(),
        timelines: [],
        checkpoints: [],
        captures: [],
      };

      store.importState(importData, { strategy: 'replace' });

      // Main timeline should still exist
      const mainTimeline = store.listTimelines().find((t) => t.id === 'main');
      expect(mainTimeline).toBeDefined();
    });

    it('should use first imported timeline as current', () => {
      const importData: ExportData = {
        version: EXPORT_VERSION,
        exportedAt: new Date().toISOString(),
        timelines: [
          {
            id: 'first-timeline',
            name: 'First',
            parentId: null,
            branchedFromCheckpointId: null,
            createdAt: Date.now(),
          },
          {
            id: 'second-timeline',
            name: 'Second',
            parentId: null,
            branchedFromCheckpointId: null,
            createdAt: Date.now(),
          },
        ],
        checkpoints: [],
        captures: [],
      };

      store.importState(importData, { strategy: 'replace' });

      expect(store.getCurrentTimeline().id).toBe('first-timeline');
    });

    it('should use main as current timeline when no timelines imported', () => {
      const importData: ExportData = {
        version: EXPORT_VERSION,
        exportedAt: new Date().toISOString(),
        timelines: [],
        checkpoints: [],
        captures: [],
      };

      store.importState(importData, { strategy: 'replace' });

      expect(store.getCurrentTimeline().id).toBe('main');
    });
  });

  describe('importState with merge strategy', () => {
    it('should add imported data to existing state', () => {
      // Create initial state
      store.capture(createMockCapture('GET', '/api/original'));
      const originalCheckpoint = store.createCheckpoint({ name: 'Original Checkpoint' });

      // Import additional data
      const importData: ExportData = {
        version: EXPORT_VERSION,
        exportedAt: new Date().toISOString(),
        timelines: [
          {
            id: 'imported-timeline',
            name: 'Imported Timeline',
            parentId: null,
            branchedFromCheckpointId: null,
            createdAt: Date.now(),
          },
        ],
        checkpoints: [
          {
            id: 'imported-cp',
            name: 'Imported Checkpoint',
            timelineId: 'imported-timeline',
            captures: [],
            createdAt: Date.now(),
          },
        ],
        captures: [createMockCapture('POST', '/api/imported')],
      };

      store.importState(importData, { strategy: 'merge' });

      // Should have both original and imported timelines
      const timelines = store.listTimelines();
      expect(timelines.some((t) => t.name === 'Main')).toBe(true);
      expect(timelines.some((t) => t.name === 'Imported Timeline')).toBe(true);

      // Should have both original and imported checkpoints
      const checkpoints = store.listCheckpoints();
      expect(checkpoints.some((c) => c.id === originalCheckpoint.id)).toBe(true);
      expect(checkpoints.some((c) => c.name === 'Imported Checkpoint')).toBe(true);

      // Should have combined captures
      expect(store.getCaptures()).toHaveLength(2);
    });

    it('should not overwrite existing timelines with same ID', () => {
      // Create a branch
      const branch = store.createBranch({ name: 'Original Branch' });

      // Try to import timeline with same ID
      const importData: ExportData = {
        version: EXPORT_VERSION,
        exportedAt: new Date().toISOString(),
        timelines: [
          {
            id: branch.id,
            name: 'Overwritten Branch', // Different name
            parentId: null,
            branchedFromCheckpointId: null,
            createdAt: Date.now(),
          },
        ],
        checkpoints: [],
        captures: [],
      };

      store.importState(importData, { strategy: 'merge' });

      // Original should be preserved
      const timeline = store.listTimelines().find((t) => t.id === branch.id);
      expect(timeline?.name).toBe('Original Branch');
    });

    it('should not overwrite existing checkpoints with same ID', () => {
      // Create a checkpoint
      store.capture(createMockCapture());
      const checkpoint = store.createCheckpoint({
        name: 'Original Checkpoint',
        description: 'Original description',
      });

      // Try to import checkpoint with same ID
      const importData: ExportData = {
        version: EXPORT_VERSION,
        exportedAt: new Date().toISOString(),
        timelines: [],
        checkpoints: [
          {
            id: checkpoint.id,
            name: 'Overwritten Checkpoint',
            timelineId: 'main',
            captures: [],
            createdAt: Date.now(),
            description: 'Overwritten description',
          },
        ],
        captures: [],
      };

      store.importState(importData, { strategy: 'merge' });

      // Original should be preserved
      const cp = store.getCheckpoint(checkpoint.id);
      expect(cp?.name).toBe('Original Checkpoint');
      expect(cp?.description).toBe('Original description');
    });

    it('should preserve current timeline when merging', () => {
      store.createBranch({ name: 'Current Branch' });
      const currentTimelineId = store.getCurrentTimeline().id;

      const importData: ExportData = {
        version: EXPORT_VERSION,
        exportedAt: new Date().toISOString(),
        timelines: [
          {
            id: 'other-timeline',
            name: 'Other',
            parentId: null,
            branchedFromCheckpointId: null,
            createdAt: Date.now(),
          },
        ],
        checkpoints: [],
        captures: [],
      };

      store.importState(importData, { strategy: 'merge' });

      // Should stay on original current timeline
      expect(store.getCurrentTimeline().id).toBe(currentTimelineId);
    });
  });

  describe('importState validation', () => {
    it('should throw error for missing version', () => {
      const invalidData = {
        exportedAt: new Date().toISOString(),
        timelines: [],
        checkpoints: [],
        captures: [],
      } as unknown as ExportData;

      expect(() => {
        store.importState(invalidData);
      }).toThrow('Invalid export data: missing or invalid version');
    });

    it('should throw error for invalid version type', () => {
      const invalidData = {
        version: 123,
        exportedAt: new Date().toISOString(),
        timelines: [],
        checkpoints: [],
        captures: [],
      } as unknown as ExportData;

      expect(() => {
        store.importState(invalidData);
      }).toThrow('Invalid export data: missing or invalid version');
    });

    it('should throw error for missing timelines array', () => {
      const invalidData = {
        version: EXPORT_VERSION,
        exportedAt: new Date().toISOString(),
        checkpoints: [],
        captures: [],
      } as unknown as ExportData;

      expect(() => {
        store.importState(invalidData);
      }).toThrow('Invalid export data: timelines must be an array');
    });

    it('should throw error for missing checkpoints array', () => {
      const invalidData = {
        version: EXPORT_VERSION,
        exportedAt: new Date().toISOString(),
        timelines: [],
        captures: [],
      } as unknown as ExportData;

      expect(() => {
        store.importState(invalidData);
      }).toThrow('Invalid export data: checkpoints must be an array');
    });

    it('should throw error for missing captures array', () => {
      const invalidData = {
        version: EXPORT_VERSION,
        exportedAt: new Date().toISOString(),
        timelines: [],
        checkpoints: [],
      } as unknown as ExportData;

      expect(() => {
        store.importState(invalidData);
      }).toThrow('Invalid export data: captures must be an array');
    });

    it('should throw error for timeline missing required fields', () => {
      const invalidData: ExportData = {
        version: EXPORT_VERSION,
        exportedAt: new Date().toISOString(),
        timelines: [{ id: 'test' } as Timeline], // Missing name
        checkpoints: [],
        captures: [],
      };

      expect(() => {
        store.importState(invalidData);
      }).toThrow('Invalid export data: timeline missing required fields');
    });

    it('should throw error for checkpoint missing required fields', () => {
      const invalidData: ExportData = {
        version: EXPORT_VERSION,
        exportedAt: new Date().toISOString(),
        timelines: [],
        checkpoints: [{ id: 'test', name: 'Test' } as Checkpoint], // Missing timelineId
        captures: [],
      };

      expect(() => {
        store.importState(invalidData);
      }).toThrow('Invalid export data: checkpoint missing required fields');
    });
  });

  describe('round-trip (export then import)', () => {
    it('should preserve data through export and import cycle', () => {
      // Set up complex state
      store.capture(createMockCapture('GET', '/api/users'));
      store.capture(createMockCapture('POST', '/api/users'));
      const checkpoint1 = store.createCheckpoint({
        name: 'Users Setup',
        description: 'Initial users',
      });

      store.createBranch({ name: 'Feature Branch' });
      // Clear captures carried over from main and add new one
      store.clearCaptures();
      store.capture(createMockCapture('PUT', '/api/users/1'));
      const checkpoint2 = store.createCheckpoint({ name: 'User Update' });

      // Export
      const exported = store.exportState();

      // Create fresh store and import
      const newStore = createMockChainStore();
      newStore.importState(exported, { strategy: 'replace' });

      // Verify timelines
      const timelines = newStore.listTimelines();
      expect(timelines.some((t) => t.name === 'Main')).toBe(true);
      expect(timelines.some((t) => t.name === 'Feature Branch')).toBe(true);

      // Verify checkpoints
      const checkpoints = newStore.listCheckpoints();
      expect(checkpoints.some((c) => c.id === checkpoint1.id)).toBe(true);
      expect(checkpoints.some((c) => c.id === checkpoint2.id)).toBe(true);

      // Verify checkpoint details preserved
      const importedCP1 = newStore.getCheckpoint(checkpoint1.id);
      expect(importedCP1?.name).toBe('Users Setup');
      expect(importedCP1?.description).toBe('Initial users');
      expect(importedCP1?.captures).toHaveLength(2);

      // Verify captures
      const captures = newStore.getCaptures();
      expect(captures).toHaveLength(1); // Only current captures (PUT request)
      expect(captures[0]?.request.method).toBe('PUT');
    });

    it('should preserve timeline relationships through round-trip', () => {
      // Create parent-child relationship
      store.createBranch({ name: 'Child Branch' });
      const childTimeline = store.getCurrentTimeline();

      const exported = store.exportState();

      const newStore = createMockChainStore();
      newStore.importState(exported, { strategy: 'replace' });

      const importedChild = newStore.listTimelines().find((t) => t.id === childTimeline.id);
      expect(importedChild?.parentId).toBe('main');
    });

    it('should allow JSON.parse(JSON.stringify()) round-trip', () => {
      store.capture(createMockCapture());
      store.createCheckpoint({ name: 'Test' });

      const exported = store.exportState();
      const jsonString = JSON.stringify(exported);
      const parsed = JSON.parse(jsonString) as ExportData;

      const newStore = createMockChainStore();
      // This should not throw
      expect(() => {
        newStore.importState(parsed, { strategy: 'replace' });
      }).not.toThrow();

      expect(newStore.listCheckpoints().some((c) => c.name === 'Test')).toBe(true);
    });
  });

  describe('default import strategy', () => {
    it('should use replace strategy by default', () => {
      store.createCheckpoint({ name: 'Original' });

      const importData: ExportData = {
        version: EXPORT_VERSION,
        exportedAt: new Date().toISOString(),
        timelines: [],
        checkpoints: [],
        captures: [],
      };

      // Import without specifying strategy
      store.importState(importData);

      // Should have replaced (original checkpoint gone)
      expect(store.listCheckpoints()).toHaveLength(0);
    });
  });
});
