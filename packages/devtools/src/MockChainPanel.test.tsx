import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, within, act } from '@testing-library/react';
import { MockChainPanel } from './MockChainPanel';
import type { MockChainStore, Checkpoint, Timeline, CapturedPair } from '@mockchain/core';

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

// Helper to create a mock timeline
function createMockTimeline(id: string, name: string, parentId: string | null = null): Timeline {
  return {
    id,
    name,
    parentId,
    branchedFromCheckpointId: null,
    createdAt: Date.now(),
  };
}

// Helper to create a mock checkpoint
function createMockCheckpoint(
  id: string,
  name: string,
  timelineId: string,
  captures: CapturedPair[] = []
): Checkpoint {
  return {
    id,
    name,
    timelineId,
    captures,
    createdAt: Date.now(),
    description: undefined,
  };
}

// Create a mock store factory
function createMockStore(overrides: Partial<MockChainStore> = {}): MockChainStore {
  const mainTimeline = createMockTimeline('main', 'Main');

  return {
    state: {
      currentTimelineId: 'main',
      timelines: new Map([['main', mainTimeline]]),
      checkpoints: new Map(),
      currentCaptures: [],
    },
    capture: vi.fn(),
    clearCaptures: vi.fn(),
    createCheckpoint: vi.fn(),
    restoreCheckpoint: vi.fn(),
    deleteCheckpoint: vi.fn(),
    getCheckpoint: vi.fn(),
    listCheckpoints: vi.fn().mockReturnValue([]),
    createBranch: vi.fn(),
    switchTimeline: vi.fn(),
    deleteTimeline: vi.fn(),
    getCurrentTimeline: vi.fn().mockReturnValue(mainTimeline),
    listTimelines: vi.fn().mockReturnValue([mainTimeline]),
    getCaptures: vi.fn().mockReturnValue([]),
    findCapture: vi.fn(),
    ...overrides,
  };
}

describe('MockChainPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Rendering', () => {
    it('should render without crashing', () => {
      const store = createMockStore();
      render(<MockChainPanel store={store} />);

      expect(screen.getByText('MockChain')).toBeInTheDocument();
    });

    it('should render in collapsed state by default', () => {
      const store = createMockStore();
      render(<MockChainPanel store={store} />);

      // In collapsed state, should show the button with MockChain text
      const button = screen.getByRole('button');
      expect(within(button).getByText('MockChain')).toBeInTheDocument();
    });

    it('should render expanded when defaultCollapsed is false', () => {
      const store = createMockStore();
      render(<MockChainPanel store={store} defaultCollapsed={false} />);

      // Should see the timeline selector when expanded
      expect(screen.getByText('Current Timeline')).toBeInTheDocument();
    });
  });

  describe('Collapse/Expand', () => {
    it('should expand when collapsed button is clicked', () => {
      const store = createMockStore();
      render(<MockChainPanel store={store} />);

      // Click the collapsed button
      const button = screen.getByRole('button');
      fireEvent.click(button);

      // Should now see expanded content
      expect(screen.getByText('Current Timeline')).toBeInTheDocument();
    });

    it('should collapse when close button is clicked', () => {
      const store = createMockStore();
      render(<MockChainPanel store={store} defaultCollapsed={false} />);

      // Find and click the close button (the x button)
      const closeButton = screen.getByRole('button', { name: /×/ });
      fireEvent.click(closeButton);

      // Should no longer see expanded content
      expect(screen.queryByText('Current Timeline')).not.toBeInTheDocument();
    });
  });

  describe('Current Timeline Display', () => {
    it('should display the current timeline in the selector', () => {
      const store = createMockStore();
      render(<MockChainPanel store={store} defaultCollapsed={false} />);

      const select = screen.getByRole('combobox');
      expect(select).toHaveValue('main');
    });

    it('should show all timelines in the dropdown', () => {
      const mainTimeline = createMockTimeline('main', 'Main');
      const featureTimeline = createMockTimeline('feature-1', 'Feature Branch', 'main');

      const store = createMockStore({
        listTimelines: vi.fn().mockReturnValue([mainTimeline, featureTimeline]),
      });

      render(<MockChainPanel store={store} defaultCollapsed={false} />);

      const select = screen.getByRole('combobox');
      const options = within(select).getAllByRole('option');

      expect(options).toHaveLength(2);
      expect(options[0]).toHaveTextContent('Main');
      expect(options[1]).toHaveTextContent('Feature Branch');
    });
  });

  describe('Checkpoints List', () => {
    it('should display empty state when no checkpoints exist', () => {
      const store = createMockStore({
        listCheckpoints: vi.fn().mockReturnValue([]),
      });

      render(<MockChainPanel store={store} defaultCollapsed={false} />);

      expect(screen.getByText(/No checkpoints yet/)).toBeInTheDocument();
    });

    it('should list checkpoints from store', () => {
      const checkpoint1 = createMockCheckpoint('cp-1', 'Checkpoint 1', 'main', [
        createMockCapture(),
      ]);
      const checkpoint2 = createMockCheckpoint('cp-2', 'Checkpoint 2', 'main', [
        createMockCapture(),
        createMockCapture(),
      ]);

      const store = createMockStore({
        listCheckpoints: vi.fn().mockReturnValue([checkpoint1, checkpoint2]),
      });

      render(<MockChainPanel store={store} defaultCollapsed={false} />);

      expect(screen.getByText('Checkpoint 1')).toBeInTheDocument();
      expect(screen.getByText('Checkpoint 2')).toBeInTheDocument();
      expect(screen.getByText(/1 captures/)).toBeInTheDocument();
      expect(screen.getByText(/2 captures/)).toBeInTheDocument();
    });

    it('should display checkpoint count in header', () => {
      const checkpoint1 = createMockCheckpoint('cp-1', 'Checkpoint 1', 'main');
      const checkpoint2 = createMockCheckpoint('cp-2', 'Checkpoint 2', 'main');

      const store = createMockStore({
        listCheckpoints: vi.fn().mockReturnValue([checkpoint1, checkpoint2]),
      });

      render(<MockChainPanel store={store} defaultCollapsed={false} />);

      expect(screen.getByText('Checkpoints (2)')).toBeInTheDocument();
    });
  });

  describe('Restore Checkpoint', () => {
    it('should call restoreCheckpoint when restore button is clicked', () => {
      const checkpoint = createMockCheckpoint('cp-1', 'Test Checkpoint', 'main');

      const store = createMockStore({
        listCheckpoints: vi.fn().mockReturnValue([checkpoint]),
      });

      render(<MockChainPanel store={store} defaultCollapsed={false} />);

      const restoreButton = screen.getByRole('button', { name: 'Restore' });
      fireEvent.click(restoreButton);

      expect(store.restoreCheckpoint).toHaveBeenCalledWith('cp-1');
    });
  });

  describe('Create Checkpoint', () => {
    it('should call createCheckpoint when button is clicked and name provided', () => {
      const store = createMockStore();

      // Mock window.prompt
      const promptSpy = vi.spyOn(window, 'prompt').mockReturnValue('New Checkpoint');

      render(<MockChainPanel store={store} defaultCollapsed={false} />);

      const checkpointButton = screen.getByRole('button', { name: /Checkpoint/ });
      fireEvent.click(checkpointButton);

      expect(promptSpy).toHaveBeenCalledWith('Checkpoint name:');
      expect(store.createCheckpoint).toHaveBeenCalledWith({ name: 'New Checkpoint' });

      promptSpy.mockRestore();
    });

    it('should not call createCheckpoint when prompt is cancelled', () => {
      const store = createMockStore();

      // Mock window.prompt returning null (cancelled)
      const promptSpy = vi.spyOn(window, 'prompt').mockReturnValue(null);

      render(<MockChainPanel store={store} defaultCollapsed={false} />);

      const checkpointButton = screen.getByRole('button', { name: /Checkpoint/ });
      fireEvent.click(checkpointButton);

      expect(store.createCheckpoint).not.toHaveBeenCalled();

      promptSpy.mockRestore();
    });
  });

  describe('Create Branch', () => {
    it('should call createBranch when branch button is clicked and name provided', () => {
      const store = createMockStore();

      const promptSpy = vi.spyOn(window, 'prompt').mockReturnValue('Feature Branch');

      render(<MockChainPanel store={store} defaultCollapsed={false} />);

      const branchButton = screen.getByRole('button', { name: /Branch/ });
      fireEvent.click(branchButton);

      expect(promptSpy).toHaveBeenCalledWith('Branch name:');
      expect(store.createBranch).toHaveBeenCalledWith({ name: 'Feature Branch' });

      promptSpy.mockRestore();
    });

    it('should not call createBranch when prompt is cancelled', () => {
      const store = createMockStore();

      const promptSpy = vi.spyOn(window, 'prompt').mockReturnValue(null);

      render(<MockChainPanel store={store} defaultCollapsed={false} />);

      const branchButton = screen.getByRole('button', { name: /Branch/ });
      fireEvent.click(branchButton);

      expect(store.createBranch).not.toHaveBeenCalled();

      promptSpy.mockRestore();
    });
  });

  describe('Timeline Switching', () => {
    it('should call switchTimeline when timeline is changed', () => {
      const mainTimeline = createMockTimeline('main', 'Main');
      const featureTimeline = createMockTimeline('feature-1', 'Feature Branch', 'main');

      const store = createMockStore({
        listTimelines: vi.fn().mockReturnValue([mainTimeline, featureTimeline]),
      });

      render(<MockChainPanel store={store} defaultCollapsed={false} />);

      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'feature-1' } });

      expect(store.switchTimeline).toHaveBeenCalledWith('feature-1');
    });
  });

  describe('Capture Count Display', () => {
    it('should display capture count in collapsed state', () => {
      const store = createMockStore({
        getCaptures: vi.fn().mockReturnValue([createMockCapture(), createMockCapture()]),
      });

      render(<MockChainPanel store={store} />);

      expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('should display capture count in footer when expanded', () => {
      const store = createMockStore({
        getCaptures: vi
          .fn()
          .mockReturnValue([createMockCapture(), createMockCapture(), createMockCapture()]),
      });

      render(<MockChainPanel store={store} defaultCollapsed={false} />);

      expect(screen.getByText('3 requests captured')).toBeInTheDocument();
    });

    it('should display singular form for one capture', () => {
      const store = createMockStore({
        getCaptures: vi.fn().mockReturnValue([createMockCapture()]),
      });

      render(<MockChainPanel store={store} defaultCollapsed={false} />);

      expect(screen.getByText('1 request captured')).toBeInTheDocument();
    });

    it('should display zero captures correctly', () => {
      const store = createMockStore({
        getCaptures: vi.fn().mockReturnValue([]),
      });

      render(<MockChainPanel store={store} defaultCollapsed={false} />);

      expect(screen.getByText('0 requests captured')).toBeInTheDocument();
    });
  });

  describe('State Refresh', () => {
    it('should poll for state updates', () => {
      const store = createMockStore();

      render(<MockChainPanel store={store} defaultCollapsed={false} />);

      // Initial call
      expect(store.listCheckpoints).toHaveBeenCalledTimes(1);

      // Advance timer by 500ms (poll interval), wrapped in act()
      act(() => {
        vi.advanceTimersByTime(500);
      });

      // Should have been called again
      expect(store.listCheckpoints).toHaveBeenCalledTimes(2);

      // Advance again
      act(() => {
        vi.advanceTimersByTime(500);
      });
      expect(store.listCheckpoints).toHaveBeenCalledTimes(3);
    });

    it('should refresh after creating a checkpoint', () => {
      const store = createMockStore();

      const promptSpy = vi.spyOn(window, 'prompt').mockReturnValue('Test CP');

      render(<MockChainPanel store={store} defaultCollapsed={false} />);

      // Clear initial calls
      vi.mocked(store.listCheckpoints).mockClear();

      const checkpointButton = screen.getByRole('button', { name: /Checkpoint/ });
      fireEvent.click(checkpointButton);

      // Should refresh after creating
      expect(store.listCheckpoints).toHaveBeenCalled();

      promptSpy.mockRestore();
    });

    it('should refresh after restoring a checkpoint', () => {
      const checkpoint = createMockCheckpoint('cp-1', 'Test', 'main');
      const store = createMockStore({
        listCheckpoints: vi.fn().mockReturnValue([checkpoint]),
      });

      render(<MockChainPanel store={store} defaultCollapsed={false} />);

      // Clear initial calls
      vi.mocked(store.listCheckpoints).mockClear();

      const restoreButton = screen.getByRole('button', { name: 'Restore' });
      fireEvent.click(restoreButton);

      expect(store.listCheckpoints).toHaveBeenCalled();
    });

    it('should refresh after creating a branch', () => {
      const store = createMockStore();

      const promptSpy = vi.spyOn(window, 'prompt').mockReturnValue('Branch');

      render(<MockChainPanel store={store} defaultCollapsed={false} />);

      vi.mocked(store.listTimelines).mockClear();

      const branchButton = screen.getByRole('button', { name: /Branch/ });
      fireEvent.click(branchButton);

      expect(store.listTimelines).toHaveBeenCalled();

      promptSpy.mockRestore();
    });

    it('should refresh after switching timeline', () => {
      const mainTimeline = createMockTimeline('main', 'Main');
      const featureTimeline = createMockTimeline('feature-1', 'Feature', 'main');

      const store = createMockStore({
        listTimelines: vi.fn().mockReturnValue([mainTimeline, featureTimeline]),
      });

      render(<MockChainPanel store={store} defaultCollapsed={false} />);

      vi.mocked(store.listCheckpoints).mockClear();

      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'feature-1' } });

      expect(store.listCheckpoints).toHaveBeenCalled();
    });
  });

  describe('Position Prop', () => {
    it('should apply bottom-right positioning by default', () => {
      const store = createMockStore();
      const { container } = render(<MockChainPanel store={store} />);

      const panel = container.firstChild as HTMLElement;
      expect(panel.style.bottom).toBe('16px');
      expect(panel.style.right).toBe('16px');
    });

    it('should apply bottom-left positioning when specified', () => {
      const store = createMockStore();
      const { container } = render(<MockChainPanel store={store} position="bottom-left" />);

      const panel = container.firstChild as HTMLElement;
      expect(panel.style.bottom).toBe('16px');
      expect(panel.style.left).toBe('16px');
    });

    it('should apply top-right positioning when specified', () => {
      const store = createMockStore();
      const { container } = render(<MockChainPanel store={store} position="top-right" />);

      const panel = container.firstChild as HTMLElement;
      expect(panel.style.top).toBe('16px');
      expect(panel.style.right).toBe('16px');
    });

    it('should apply top-left positioning when specified', () => {
      const store = createMockStore();
      const { container } = render(<MockChainPanel store={store} position="top-left" />);

      const panel = container.firstChild as HTMLElement;
      expect(panel.style.top).toBe('16px');
      expect(panel.style.left).toBe('16px');
    });
  });

  describe('UI State Updates', () => {
    it('should update UI when store state changes', () => {
      const checkpoint1 = createMockCheckpoint('cp-1', 'Initial Checkpoint', 'main');

      let checkpoints = [checkpoint1];

      const store = createMockStore({
        listCheckpoints: vi.fn(() => checkpoints),
      });

      render(<MockChainPanel store={store} defaultCollapsed={false} />);

      expect(screen.getByText('Initial Checkpoint')).toBeInTheDocument();
      expect(screen.getByText('Checkpoints (1)')).toBeInTheDocument();

      // Add a new checkpoint
      const checkpoint2 = createMockCheckpoint('cp-2', 'New Checkpoint', 'main');
      checkpoints = [checkpoint1, checkpoint2];

      // Advance timer to trigger refresh, wrapped in act()
      act(() => {
        vi.advanceTimersByTime(500);
      });

      expect(screen.getByText('New Checkpoint')).toBeInTheDocument();
    });

    it('should update current timeline display when it changes', () => {
      const mainTimeline = createMockTimeline('main', 'Main');
      const featureTimeline = createMockTimeline('feature-1', 'Feature', 'main');

      let currentTimelineId = 'main';

      const store = createMockStore({
        listTimelines: vi.fn().mockReturnValue([mainTimeline, featureTimeline]),
        getCurrentTimeline: vi.fn(() =>
          currentTimelineId === 'main' ? mainTimeline : featureTimeline
        ),
      });

      render(<MockChainPanel store={store} defaultCollapsed={false} />);

      const select = screen.getByRole('combobox');
      expect(select).toHaveValue('main');

      // Change current timeline
      currentTimelineId = 'feature-1';

      // Advance timer to trigger refresh, wrapped in act()
      act(() => {
        vi.advanceTimersByTime(500);
      });

      expect(select).toHaveValue('feature-1');
    });
  });
});

describe('MockChainPanel Edge Cases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle empty branch name gracefully', () => {
    const store = createMockStore();

    const promptSpy = vi.spyOn(window, 'prompt').mockReturnValue('');

    render(<MockChainPanel store={store} defaultCollapsed={false} />);

    const branchButton = screen.getByRole('button', { name: /Branch/ });
    fireEvent.click(branchButton);

    // Empty string is falsy, so should not call createBranch
    expect(store.createBranch).not.toHaveBeenCalled();

    promptSpy.mockRestore();
  });

  it('should handle checkpoint with zero captures', () => {
    const checkpoint = createMockCheckpoint('cp-1', 'Empty Checkpoint', 'main', []);

    const store = createMockStore({
      listCheckpoints: vi.fn().mockReturnValue([checkpoint]),
    });

    render(<MockChainPanel store={store} defaultCollapsed={false} />);

    expect(screen.getByText('Empty Checkpoint')).toBeInTheDocument();
    expect(screen.getByText(/0 captures/)).toBeInTheDocument();
  });

  it('should cleanup interval on unmount', () => {
    vi.useFakeTimers();
    const store = createMockStore();

    const { unmount } = render(<MockChainPanel store={store} defaultCollapsed={false} />);

    // Initial call
    expect(store.listCheckpoints).toHaveBeenCalledTimes(1);

    // Unmount the component
    unmount();

    // Clear the mock
    vi.mocked(store.listCheckpoints).mockClear();

    // Advance timer, wrapped in act()
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    // Should not have been called after unmount
    expect(store.listCheckpoints).not.toHaveBeenCalled();

    vi.useRealTimers();
  });
});
