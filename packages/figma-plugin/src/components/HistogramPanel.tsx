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

import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { emit, on } from '@create-figma-plugin/utilities';
import { Text, Bold, VerticalSpace } from '@create-figma-plugin/ui';
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

  const MAX_HEIGHT = 80; // pixels
  const BAR_WIDTH = 8; // pixels
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
      <div
        style={{
          backgroundColor: 'var(--color-bg-secondary)',
          padding: '16px',
          borderRadius: '4px',
          display: 'block',
          visibility: 'visible'
        }}
      >
        <Text>
          <Bold>Recent Activity</Bold>
        </Text>
        <VerticalSpace space="small" />
        <Text style={{ fontSize: '11px', color: 'var(--color-text-secondary)', display: 'block' }}>
          Loading history...
        </Text>
      </div>
    );
  }

  if (bars.length === 0) {
    return (
      <div
        style={{
          backgroundColor: 'var(--color-bg-secondary)',
          padding: '16px',
          borderRadius: '4px',
          display: 'block',
          visibility: 'visible'
        }}
      >
        <Text>
          <Bold>Recent Activity</Bold>
        </Text>
        <VerticalSpace space="small" />
        <Text style={{ fontSize: '11px', color: 'var(--color-text-secondary)', display: 'block' }}>
          No commits yet. Create your first version to see activity history.
        </Text>
      </div>
    );
  }

  const scale = calculateScale(bars, MAX_HEIGHT);

  return (
    <div
      style={{
        backgroundColor: 'var(--color-bg-secondary)',
        padding: '16px',
        borderRadius: '4px',
        position: 'relative'
      }}
    >
      <Text>
        <Bold>Recent Activity</Bold>
      </Text>
      <VerticalSpace space="small" />

      {/* Legend */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '12px',
              height: '12px',
              borderRadius: '2px',
              backgroundColor: 'rgb(59 130 246)'
            }}
          />
          <Text style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>Feedback</Text>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '12px',
              height: '12px',
              borderRadius: '2px',
              backgroundColor: 'rgb(249 115 22)'
            }}
          />
          <Text style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>Nodes Changed</Text>
        </div>
      </div>

      {/* Histogram bars with horizontal scroll */}
      <div
        style={{
          maxWidth: '100%',
          scrollbarWidth: 'thin',
          overflowX: 'auto',
          paddingBottom: '8px',
          position: 'relative'
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            gap: `${BAR_GAP}px`,
            height: `${MAX_HEIGHT + 20}px`,
            minWidth: `${bars.length * (BAR_WIDTH + BAR_GAP)}px`
          }}
        >
          {bars.map((bar) => {
            const feedbackHeight = Math.round(bar.feedbackCount * scale);
            const nodesDeltaHeight = Math.round(bar.nodesDelta * scale);

            return (
              <div
                key={bar.commitId}
                style={{
                  width: `${BAR_WIDTH}px`,
                  height: `${MAX_HEIGHT}px`,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'flex-end',
                  cursor: 'pointer',
                  position: 'relative'
                }}
                onClick={() => handleBarClick(bar)}
                onMouseEnter={(e) => handleBarHover(bar, e as any)}
                onMouseLeave={handleBarLeave}
              >
                {/* Nodes delta layer (orange) - appears on top */}
                {nodesDeltaHeight > 0 && (
                  <div
                    style={{
                      height: `${Math.max(nodesDeltaHeight, 2)}px`,
                      width: '100%',
                      backgroundColor: 'rgb(249 115 22)',
                      borderRadius: '1px'
                    }}
                  />
                )}

                {/* Feedback layer (blue) - appears below */}
                {feedbackHeight > 0 && (
                  <div
                    style={{
                      height: `${Math.max(feedbackHeight, 2)}px`,
                      width: '100%',
                      backgroundColor: 'rgb(59 130 246)',
                      borderRadius: '1px'
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          style={{
            position: 'absolute',
            left: `${tooltip.x}px`,
            top: `${tooltip.y}px`,
            transform: 'translate(-50%, -100%)',
            backgroundColor: 'rgb(17 24 39)',
            color: 'white',
            fontSize: '11px',
            padding: '8px 12px',
            borderRadius: '4px',
            maxWidth: '200px',
            pointerEvents: 'none',
            zIndex: 100,
            boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
            whiteSpace: 'normal',
            wordWrap: 'break-word'
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: '4px' }}>{tooltip.version}</div>
          <div style={{ marginBottom: '4px', color: 'rgb(209 213 219)' }}>{tooltip.title}</div>
          <div style={{ color: 'rgb(156 163 175)' }}>
            <div>Feedback: {tooltip.feedbackCount}</div>
            {tooltip.nodesDelta > 0 && <div>Nodes Changed: {tooltip.nodesDelta}</div>}
          </div>
        </div>
      )}

      <VerticalSpace space="extraSmall" />
      <Text style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
        Showing {bars.length} most recent {bars.length === 1 ? 'commit' : 'commits'}. Click a bar to view in
        changelog.
      </Text>
    </div>
  );
}
