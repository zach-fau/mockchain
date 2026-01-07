import { createStore } from 'zustand/vanilla';
import type {
  MockChainState,
  Timeline,
  Checkpoint,
  CapturedPair,
  CheckpointOptions,
  BranchOptions,
} from './types';
import { generateId } from './utils';

const MAIN_TIMELINE_ID = 'main';

function createInitialState(): MockChainState {
  const mainTimeline: Timeline = {
    id: MAIN_TIMELINE_ID,
    name: 'Main',
    parentId: null,
    branchedFromCheckpointId: null,
    createdAt: Date.now(),
  };

  return {
    currentTimelineId: MAIN_TIMELINE_ID,
    timelines: new Map([[MAIN_TIMELINE_ID, mainTimeline]]),
    checkpoints: new Map(),
    currentCaptures: [],
  };
}

export interface MockChainStore {
  state: MockChainState;

  // Capture management
  capture: (pair: CapturedPair) => void;
  clearCaptures: () => void;

  // Checkpoint management
  createCheckpoint: (options: CheckpointOptions) => Checkpoint;
  restoreCheckpoint: (checkpointId: string) => void;
  deleteCheckpoint: (checkpointId: string) => void;
  getCheckpoint: (checkpointId: string) => Checkpoint | undefined;
  listCheckpoints: (timelineId?: string) => Checkpoint[];

  // Timeline/branch management
  createBranch: (options: BranchOptions) => Timeline;
  switchTimeline: (timelineId: string) => void;
  deleteTimeline: (timelineId: string) => void;
  getCurrentTimeline: () => Timeline;
  listTimelines: () => Timeline[];

  // State queries
  getCaptures: () => CapturedPair[];
  findCapture: (method: string, url: string) => CapturedPair | undefined;
}

export function createMockChainStore(): MockChainStore {
  const store = createStore<MockChainState>()(() => createInitialState());

  const capture = (pair: CapturedPair): void => {
    store.setState((state) => ({
      ...state,
      currentCaptures: [...state.currentCaptures, pair],
    }));
  };

  const clearCaptures = (): void => {
    store.setState((state) => ({
      ...state,
      currentCaptures: [],
    }));
  };

  const createCheckpoint = (options: CheckpointOptions): Checkpoint => {
    const state = store.getState();
    const checkpoint: Checkpoint = {
      id: generateId(),
      name: options.name,
      timelineId: state.currentTimelineId,
      captures: [...state.currentCaptures],
      createdAt: Date.now(),
      description: options.description,
    };

    const newCheckpoints = new Map(state.checkpoints);
    newCheckpoints.set(checkpoint.id, checkpoint);

    store.setState({
      ...state,
      checkpoints: newCheckpoints,
    });

    return checkpoint;
  };

  const restoreCheckpoint = (checkpointId: string): void => {
    const state = store.getState();
    const checkpoint = state.checkpoints.get(checkpointId);

    if (!checkpoint) {
      throw new Error(`Checkpoint "${checkpointId}" not found`);
    }

    store.setState({
      ...state,
      currentTimelineId: checkpoint.timelineId,
      currentCaptures: [...checkpoint.captures],
    });
  };

  const deleteCheckpoint = (checkpointId: string): void => {
    const state = store.getState();
    const newCheckpoints = new Map(state.checkpoints);
    newCheckpoints.delete(checkpointId);

    store.setState({
      ...state,
      checkpoints: newCheckpoints,
    });
  };

  const getCheckpoint = (checkpointId: string): Checkpoint | undefined => {
    return store.getState().checkpoints.get(checkpointId);
  };

  const listCheckpoints = (timelineId?: string): Checkpoint[] => {
    const state = store.getState();
    const checkpoints = Array.from(state.checkpoints.values());

    if (timelineId) {
      return checkpoints.filter((cp) => cp.timelineId === timelineId);
    }

    return checkpoints;
  };

  const createBranch = (options: BranchOptions): Timeline => {
    const state = store.getState();

    // If branching from a specific checkpoint, use that checkpoint's captures
    let captures: CapturedPair[] = [...state.currentCaptures];
    if (options.fromCheckpointId) {
      const checkpoint = state.checkpoints.get(options.fromCheckpointId);
      if (!checkpoint) {
        throw new Error(`Checkpoint "${options.fromCheckpointId}" not found`);
      }
      captures = [...checkpoint.captures];
    }

    const timeline: Timeline = {
      id: generateId(),
      name: options.name,
      parentId: state.currentTimelineId,
      branchedFromCheckpointId: options.fromCheckpointId ?? null,
      createdAt: Date.now(),
    };

    const newTimelines = new Map(state.timelines);
    newTimelines.set(timeline.id, timeline);

    store.setState({
      ...state,
      timelines: newTimelines,
      currentTimelineId: timeline.id,
      currentCaptures: captures,
    });

    return timeline;
  };

  const switchTimeline = (timelineId: string): void => {
    const state = store.getState();

    if (!state.timelines.has(timelineId)) {
      throw new Error(`Timeline "${timelineId}" not found`);
    }

    store.setState({
      ...state,
      currentTimelineId: timelineId,
      // Note: switching timelines clears current captures
      // Use checkpoint restore to maintain state
      currentCaptures: [],
    });
  };

  const deleteTimeline = (timelineId: string): void => {
    if (timelineId === MAIN_TIMELINE_ID) {
      throw new Error('Cannot delete main timeline');
    }

    const state = store.getState();

    if (!state.timelines.has(timelineId)) {
      throw new Error(`Timeline "${timelineId}" not found`);
    }

    const newTimelines = new Map(state.timelines);
    newTimelines.delete(timelineId);

    // Delete all checkpoints in this timeline
    const newCheckpoints = new Map(state.checkpoints);
    for (const [id, checkpoint] of state.checkpoints) {
      if (checkpoint.timelineId === timelineId) {
        newCheckpoints.delete(id);
      }
    }

    // Switch to main if deleting current timeline
    const newCurrentTimelineId =
      state.currentTimelineId === timelineId ? MAIN_TIMELINE_ID : state.currentTimelineId;

    store.setState({
      ...state,
      timelines: newTimelines,
      checkpoints: newCheckpoints,
      currentTimelineId: newCurrentTimelineId,
      currentCaptures: newCurrentTimelineId !== state.currentTimelineId ? [] : state.currentCaptures,
    });
  };

  const getCurrentTimeline = (): Timeline => {
    const state = store.getState();
    const timeline = state.timelines.get(state.currentTimelineId);
    if (!timeline) {
      throw new Error('Current timeline not found - this should never happen');
    }
    return timeline;
  };

  const listTimelines = (): Timeline[] => {
    return Array.from(store.getState().timelines.values());
  };

  const getCaptures = (): CapturedPair[] => {
    return store.getState().currentCaptures;
  };

  const findCapture = (method: string, url: string): CapturedPair | undefined => {
    const captures = store.getState().currentCaptures;
    // Find most recent matching capture (last one wins)
    for (let i = captures.length - 1; i >= 0; i--) {
      const capture = captures[i];
      if (capture?.request.method === method && capture.request.url === url) {
        return capture;
      }
    }
    return undefined;
  };

  return {
    get state() {
      return store.getState();
    },
    capture,
    clearCaptures,
    createCheckpoint,
    restoreCheckpoint,
    deleteCheckpoint,
    getCheckpoint,
    listCheckpoints,
    createBranch,
    switchTimeline,
    deleteTimeline,
    getCurrentTimeline,
    listTimelines,
    getCaptures,
    findCapture,
  };
}

// Default singleton instance
let defaultStore: MockChainStore | null = null;

export function getMockChainStore(): MockChainStore {
  defaultStore ??= createMockChainStore();
  return defaultStore;
}

export function resetMockChainStore(): void {
  defaultStore = null;
}
