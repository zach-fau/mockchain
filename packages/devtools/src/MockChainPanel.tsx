import { useState, useEffect, useCallback } from 'react';
import type { MockChainStore, Checkpoint, Timeline } from '@mockchain/core';

export interface MockChainPanelProps {
  /** The MockChain store to display */
  store: MockChainStore;
  /** Position of the panel */
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  /** Initial collapsed state */
  defaultCollapsed?: boolean;
}

export function MockChainPanel({
  store,
  position = 'bottom-right',
  defaultCollapsed = true,
}: MockChainPanelProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [timelines, setTimelines] = useState<Timeline[]>([]);
  const [currentTimelineId, setCurrentTimelineId] = useState<string>('main');
  const [captureCount, setCaptureCount] = useState(0);

  // Refresh state from store
  const refresh = useCallback(() => {
    setCheckpoints(store.listCheckpoints());
    setTimelines(store.listTimelines());
    setCurrentTimelineId(store.getCurrentTimeline().id);
    setCaptureCount(store.getCaptures().length);
  }, [store]);

  useEffect(() => {
    refresh();
    // Set up polling for state changes (zustand doesn't have built-in subscriptions in vanilla)
    const interval = setInterval(refresh, 500);
    return () => {
      clearInterval(interval);
    };
  }, [refresh]);

  const handleCreateCheckpoint = useCallback(() => {
    const name = prompt('Checkpoint name:');
    if (name) {
      store.createCheckpoint({ name });
      refresh();
    }
  }, [store, refresh]);

  const handleRestoreCheckpoint = useCallback(
    (checkpointId: string) => {
      store.restoreCheckpoint(checkpointId);
      refresh();
    },
    [store, refresh]
  );

  const handleCreateBranch = useCallback(() => {
    const name = prompt('Branch name:');
    if (name) {
      store.createBranch({ name });
      refresh();
    }
  }, [store, refresh]);

  const handleSwitchTimeline = useCallback(
    (timelineId: string) => {
      store.switchTimeline(timelineId);
      refresh();
    },
    [store, refresh]
  );

  const positionStyles: Record<string, React.CSSProperties> = {
    'bottom-right': { bottom: 16, right: 16 },
    'bottom-left': { bottom: 16, left: 16 },
    'top-right': { top: 16, right: 16 },
    'top-left': { top: 16, left: 16 },
  };

  return (
    <div
      style={{
        position: 'fixed',
        ...positionStyles[position],
        zIndex: 99999,
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: 12,
      }}
    >
      {collapsed ? (
        <button
          onClick={() => {
            setCollapsed(false);
          }}
          style={{
            background: '#1a1a2e',
            color: '#eee',
            border: '1px solid #333',
            borderRadius: 8,
            padding: '8px 12px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <span style={{ fontSize: 16 }}>⛓️</span>
          <span>MockChain</span>
          <span
            style={{
              background: captureCount > 0 ? '#4ade80' : '#666',
              color: captureCount > 0 ? '#000' : '#fff',
              borderRadius: 10,
              padding: '2px 6px',
              fontSize: 10,
            }}
          >
            {captureCount}
          </span>
        </button>
      ) : (
        <div
          style={{
            background: '#1a1a2e',
            color: '#eee',
            border: '1px solid #333',
            borderRadius: 8,
            width: 320,
            maxHeight: 400,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '8px 12px',
              borderBottom: '1px solid #333',
            }}
          >
            <span style={{ fontWeight: 600 }}>⛓️ MockChain</span>
            <button
              onClick={() => {
                setCollapsed(true);
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#888',
                cursor: 'pointer',
                fontSize: 16,
              }}
            >
              ×
            </button>
          </div>

          {/* Current Timeline */}
          <div style={{ padding: '8px 12px', borderBottom: '1px solid #333' }}>
            <div
              style={{ marginBottom: 4, color: '#888', fontSize: 10, textTransform: 'uppercase' }}
            >
              Current Timeline
            </div>
            <select
              value={currentTimelineId}
              onChange={(e) => {
                handleSwitchTimeline(e.target.value);
              }}
              style={{
                width: '100%',
                background: '#2a2a3e',
                color: '#eee',
                border: '1px solid #444',
                borderRadius: 4,
                padding: '4px 8px',
              }}
            >
              {timelines.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          {/* Actions */}
          <div
            style={{ padding: '8px 12px', borderBottom: '1px solid #333', display: 'flex', gap: 8 }}
          >
            <button
              onClick={handleCreateCheckpoint}
              style={{
                flex: 1,
                background: '#4ade80',
                color: '#000',
                border: 'none',
                borderRadius: 4,
                padding: '6px 8px',
                cursor: 'pointer',
                fontWeight: 500,
              }}
            >
              📌 Checkpoint
            </button>
            <button
              onClick={handleCreateBranch}
              style={{
                flex: 1,
                background: '#60a5fa',
                color: '#000',
                border: 'none',
                borderRadius: 4,
                padding: '6px 8px',
                cursor: 'pointer',
                fontWeight: 500,
              }}
            >
              🌿 Branch
            </button>
          </div>

          {/* Checkpoints List */}
          <div style={{ flex: 1, overflow: 'auto', padding: '8px 12px' }}>
            <div
              style={{ marginBottom: 4, color: '#888', fontSize: 10, textTransform: 'uppercase' }}
            >
              Checkpoints ({checkpoints.length})
            </div>
            {checkpoints.length === 0 ? (
              <div style={{ color: '#666', fontSize: 11, fontStyle: 'italic' }}>
                No checkpoints yet. Capture some requests and create a checkpoint.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {checkpoints.map((cp) => (
                  <div
                    key={cp.id}
                    style={{
                      background: '#2a2a3e',
                      borderRadius: 4,
                      padding: '6px 8px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 500 }}>{cp.name}</div>
                      <div style={{ fontSize: 10, color: '#888' }}>
                        {cp.captures.length} captures •{' '}
                        {new Date(cp.createdAt).toLocaleTimeString()}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        handleRestoreCheckpoint(cp.id);
                      }}
                      style={{
                        background: '#facc15',
                        color: '#000',
                        border: 'none',
                        borderRadius: 4,
                        padding: '4px 8px',
                        cursor: 'pointer',
                        fontSize: 11,
                        fontWeight: 500,
                      }}
                    >
                      Restore
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div
            style={{
              padding: '6px 12px',
              borderTop: '1px solid #333',
              color: '#666',
              fontSize: 10,
              textAlign: 'center',
            }}
          >
            {captureCount} request{captureCount !== 1 ? 's' : ''} captured
          </div>
        </div>
      )}
    </div>
  );
}
