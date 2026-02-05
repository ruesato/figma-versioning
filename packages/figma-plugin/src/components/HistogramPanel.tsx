/**
 * Histogram Panel Component
 *
 * Displays an activity histogram in the plugin UI showing recent commit activity.
 * Features:
 * - Stacked bars (blue=feedback, orange=nodes changed)
 * - Hover tooltips with commit details
 * - Horizontal scrolling for large histories
 * - Click to navigate to changelog (sends message to main thread)
 */

import { h } from 'preact'; // eslint-disable-line @typescript-eslint/no-unused-vars
import { useState, useEffect } from 'preact/hooks';
import { emit, on } from '@create-figma-plugin/utilities';
import type { Commit } from '@figma-versioning/core';

interface HistogramBar {
  commitId: string;
  version: string;
  title: string;
  timestamp: Date;
  feedbackCount: number;
  nodesDelta: number;
  totalHeight: number;
}

interface TooltipData {
  version: string;
  title: string;
  feedbackCount: number;
  nodesDelta: number;
  x: number;
  y: number;
}

/**
 * Calculate histogram bar data from commits
 */
function calculateHistogramBars(commits: Commit[], maxBars: number = 50): HistogramBar[] {
  if (commits.length === 0) {
    return [];
  }

  // Sort commits chronologically (oldest first) for delta calculation
  const sortedCommits = [...commits].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  // Take most recent commits
  const recentCommits = sortedCommits.slice(-maxBars);

  // Calculate histogram bars with deltas
  const bars: HistogramBar[] = recentCommits.map((commit, index) => {
    const feedbackCount = commit.metrics.feedbackCount;

    // Calculate nodes delta if not already present
    let nodesDelta = commit.metrics.nodesDelta ?? 0;
    if (nodesDelta === 0 && index > 0) {
      const previousCommit = recentCommits[index - 1];
      nodesDelta = commit.metrics.totalNodes - previousCommit.metrics.totalNodes;
    }

    // Use absolute value for visualization
    const absNodesDelta = Math.abs(nodesDelta);

    return {
      commitId: commit.id,
      version: commit.version,
      title: commit.title,
      timestamp: new Date(commit.timestamp),
      feedbackCount,
      nodesDelta: absNodesDelta,
      totalHeight: feedbackCount + absNodesDelta,
    };
  });

  // Return in reverse chronological order (newest first) for display
  return bars.reverse();
}

/**
 * Calculate scale factor for bar heights
 */
function calculateScale(bars: HistogramBar[], maxHeight: number): number {
  if (bars.length === 0) {
    return 1;
  }

  const maxValue = Math.max(...bars.map((bar) => bar.totalHeight));

  if (maxValue === 0) {
    return 1;
  }

  return maxHeight / maxValue;
}

export function HistogramPanel() {
  const [bars, setBars] = useState<HistogramBar[]>([]);
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const [loading, setLoading] = useState(true);

  console.log('[HistogramPanel] Component rendering, bars:', bars.length, 'loading:', loading);

  const MAX_HEIGHT = 160; // pixels - matches Figma design
  const BAR_GAP = 4; // pixels

  // Load commits on mount
  useEffect(() => {
    console.log('[HistogramPanel] useEffect running, emitting GET_RECENT_COMMITS');

    // Request commits from main thread
    emit('GET_RECENT_COMMITS', { maxCommits: 50 });

    const unsubscribe = on('RECENT_COMMITS', function (data: { commits: Commit[] }) {
      console.log('[HistogramPanel] Received RECENT_COMMITS:', data.commits.length, 'commits');
      const histogramBars = calculateHistogramBars(data.commits);
      setBars(histogramBars);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  function handleBarClick(bar: HistogramBar) {
    // Emit event to navigate to changelog entry
    emit('NAVIGATE_TO_COMMIT', { commitId: bar.commitId });
  }

  function handleBarHover(bar: HistogramBar, event: MouseEvent) {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    setTooltip({
      version: bar.version,
      title: bar.title,
      feedbackCount: bar.feedbackCount,
      nodesDelta: bar.nodesDelta,
      x: rect.left + rect.width / 2,
      y: rect.top - 10,
    });
  }

  function handleBarLeave() {
    setTooltip(null);
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', paddingBottom: '24px', width: '100%', maxWidth: '100%', minWidth: 0, overflow: 'hidden' }}>
        <p style={{
          fontFamily: 'Inter, sans-serif',
          fontWeight: 400,
          fontSize: '12px',
          color: '#bbb',
          textTransform: 'uppercase',
          margin: 0
        }}>
          Recent activity
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', minWidth: 0 }}>
          <div style={{ height: `${MAX_HEIGHT}px`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: '#808080', margin: 0 }}>
              Loading history...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (bars.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', paddingBottom: '24px', width: '100%', maxWidth: '100%', minWidth: 0, overflow: 'hidden' }}>
        <p style={{
          fontFamily: 'Inter, sans-serif',
          fontWeight: 400,
          fontSize: '12px',
          color: '#bbb',
          textTransform: 'uppercase',
          margin: 0
        }}>
          Recent activity
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', minWidth: 0 }}>
          <div style={{ height: `${MAX_HEIGHT}px`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: '#808080', margin: 0 }}>
              No commits yet. Create your first version to see activity history.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const scale = calculateScale(bars, MAX_HEIGHT);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', paddingBottom: '24px', position: 'relative', width: '100%', maxWidth: '100%', minWidth: 0, overflow: 'hidden' }}>
      <p style={{
        fontFamily: 'Inter, sans-serif',
        fontWeight: 400,
        fontSize: '12px',
        color: '#bbb',
        textTransform: 'uppercase',
        margin: 0
      }}>
        Recent activity
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', minWidth: 0 }}>
        {/* Histogram bars */}
        <div
          style={{
            display: 'flex',
            gap: `${BAR_GAP}px`,
            height: `${MAX_HEIGHT}px`,
            alignItems: 'flex-end',
            width: '100%',
            minWidth: 0
          }}
        >
          {bars.map((bar) => {
            const feedbackHeight = Math.round(bar.feedbackCount * scale);
            const nodesDeltaHeight = Math.round(bar.nodesDelta * scale);
            // Determine primary color based on which value is larger
            const isFeedbackDominant = bar.feedbackCount > bar.nodesDelta;
            const barColor = isFeedbackDominant ? '#0885fe' : '#ff6800';
            const totalHeight = Math.max(feedbackHeight + nodesDeltaHeight, 1);

            return (
              <div
                key={bar.commitId}
                style={{
                  flex: '1 0 0',
                  height: `${totalHeight}px`,
                  minHeight: '1px',
                  minWidth: '1px',
                  backgroundColor: barColor,
                  cursor: 'pointer'
                }}
                onClick={() => handleBarClick(bar)}
                onMouseEnter={(e) => handleBarHover(bar, e as any)}
                onMouseLeave={handleBarLeave}
              />
            );
          })}
        </div>

        {/* Caption */}
        <p style={{
          fontFamily: 'Inter, sans-serif',
          fontWeight: 400,
          fontSize: '12px',
          color: '#808080',
          margin: 0
        }}>
          Last {bars.length} commits. Select a bar to view its changelog entry.
        </p>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          style={{
            position: 'fixed',
            left: `${tooltip.x}px`,
            top: `${tooltip.y - 10}px`,
            transform: 'translate(-50%, -100%)',
            backgroundColor: '#1a1a1a',
            color: 'white',
            fontSize: '12px',
            padding: '8px 12px',
            borderRadius: '8px',
            maxWidth: '200px',
            pointerEvents: 'none',
            zIndex: 1000,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
            whiteSpace: 'normal',
            wordWrap: 'break-word'
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: '4px' }}>{tooltip.version}</div>
          <div style={{ marginBottom: '4px', color: '#bbb' }}>{tooltip.title}</div>
          <div style={{ color: '#808080', fontSize: '11px' }}>
            <div>Feedback: {tooltip.feedbackCount}</div>
            {tooltip.nodesDelta > 0 && <div>Nodes changed: {tooltip.nodesDelta}</div>}
          </div>
        </div>
      )}
    </div>
  );
}
