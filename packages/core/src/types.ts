/**
 * Represents a captured HTTP request/response pair
 */
export interface CapturedRequest {
  /** Unique identifier for this request */
  id: string;
  /** HTTP method (GET, POST, etc.) */
  method: string;
  /** Request URL */
  url: string;
  /** Request headers */
  headers: Record<string, string>;
  /** Request body (if applicable) */
  body?: unknown;
  /** Timestamp when request was captured */
  timestamp: number;
}

export interface CapturedResponse {
  /** HTTP status code */
  status: number;
  /** Response headers */
  headers: Record<string, string>;
  /** Response body */
  body: unknown;
  /** Response time in milliseconds */
  responseTime: number;
}

export interface CapturedPair {
  request: CapturedRequest;
  response: CapturedResponse;
}

/**
 * A checkpoint represents a snapshot of all captured state at a point in time
 */
export interface Checkpoint {
  /** Unique identifier for this checkpoint */
  id: string;
  /** User-provided name for the checkpoint */
  name: string;
  /** Timeline this checkpoint belongs to */
  timelineId: string;
  /** All captured request/response pairs at checkpoint time */
  captures: CapturedPair[];
  /** Timestamp when checkpoint was created */
  createdAt: number;
  /** Optional description */
  description?: string | undefined;
}

/**
 * A timeline represents an isolated branch of mock state
 */
export interface Timeline {
  /** Unique identifier for this timeline */
  id: string;
  /** User-provided name for the timeline */
  name: string;
  /** Parent timeline ID (null for main timeline) */
  parentId: string | null;
  /** Checkpoint this timeline was branched from (if branched) */
  branchedFromCheckpointId: string | null;
  /** Timestamp when timeline was created */
  createdAt: number;
}

/**
 * The complete state of MockChain
 */
export interface MockChainState {
  /** Current active timeline */
  currentTimelineId: string;
  /** All timelines */
  timelines: Map<string, Timeline>;
  /** All checkpoints across all timelines */
  checkpoints: Map<string, Checkpoint>;
  /** Current captured pairs (not yet checkpointed) */
  currentCaptures: CapturedPair[];
}

/**
 * Options for creating a checkpoint
 */
export interface CheckpointOptions {
  /** Name for the checkpoint */
  name: string;
  /** Optional description */
  description?: string | undefined;
}

/**
 * Options for creating a branch/timeline
 */
export interface BranchOptions {
  /** Name for the new timeline */
  name: string;
  /** Checkpoint to branch from (defaults to current state) */
  fromCheckpointId?: string | undefined;
}

/**
 * Request matching configuration
 */
export interface RequestMatcher {
  /** Match by HTTP method */
  method?: string | undefined;
  /** Match by URL pattern (string or RegExp) */
  url?: string | RegExp | undefined;
  /** Custom matching function */
  match?: ((request: CapturedRequest) => boolean) | undefined;
}
