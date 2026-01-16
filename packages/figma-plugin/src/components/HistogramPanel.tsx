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
import { Text, Muted, Bold, VerticalSpace } from '@create-figma-plugin/ui';
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

  const MAX_HEIGHT = 80; // pixels
  const BAR_WIDTH = 8; // pixels
  const BAR_GAP = 4; // pixels

  // Load commits on mount
  useEffect(() => {
    // Request commits from main thread
    emit('GET_RECENT_COMMITS', { maxCommits: 50 });

    const unsubscribe = on('RECENT_COMMITS', function (data: { commits: Commit[] }) {
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
      <div class="bg-gray-50 dark:bg-gray-800 rounded p-4">
        <Text>
          <Bold>Recent Activity</Bold>
        </Text>
        <VerticalSpace space="small" />
        <Muted>Loading history...</Muted>
      </div>
    );
  }

  if (bars.length === 0) {
    return (
      <div class="bg-gray-50 dark:bg-gray-800 rounded p-4">
        <Text>
          <Bold>Recent Activity</Bold>
        </Text>
        <VerticalSpace space="small" />
        <Muted>No commits yet. Create your first version to see activity history.</Muted>
      </div>
    );
  }

  const scale = calculateScale(bars, MAX_HEIGHT);

  return (
    <div class="bg-gray-50 dark:bg-gray-800 rounded p-4">
      <Text>
        <Bold>Recent Activity</Bold>
      </Text>
      <VerticalSpace space="small" />

      {/* Legend */}
      <div class="flex gap-4 mb-3">
        <div class="flex items-center gap-2">
          <div class="w-3 h-3 bg-blue-500" style={{ borderRadius: '2px' }} />
          <Muted>Feedback</Muted>
        </div>
        <div class="flex items-center gap-2">
          <div class="w-3 h-3 bg-orange-500" style={{ borderRadius: '2px' }} />
          <Muted>Nodes Changed</Muted>
        </div>
      </div>

      {/* Histogram bars with horizontal scroll */}
      <div
        class="overflow-x-auto pb-2"
        style={{
          maxWidth: '100%',
          scrollbarWidth: 'thin',
        }}
      >
        <div
          class="flex items-end gap-1"
          style={{
            height: `${MAX_HEIGHT + 20}px`,
            minWidth: `${bars.length * (BAR_WIDTH + BAR_GAP)}px`,
          }}
        >
          {bars.map((bar) => {
            const feedbackHeight = Math.round(bar.feedbackCount * scale);
            const nodesDeltaHeight = Math.round(bar.nodesDelta * scale);

            return (
              <div
                key={bar.commitId}
                class="flex flex-col justify-end cursor-pointer transition-opacity hover:opacity-80"
                style={{
                  width: `${BAR_WIDTH}px`,
                  height: `${MAX_HEIGHT}px`,
                }}
                onClick={() => handleBarClick(bar)}
                onMouseEnter={(e) => handleBarHover(bar, e as any)}
                onMouseLeave={handleBarLeave}
              >
                {/* Nodes delta layer (orange) - appears on top */}
                {nodesDeltaHeight > 0 && (
                  <div
                    class="bg-orange-500"
                    style={{
                      height: `${nodesDeltaHeight}px`,
                      width: '100%',
                    }}
                  />
                )}

                {/* Feedback layer (blue) - appears below */}
                {feedbackHeight > 0 && (
                  <div
                    class="bg-blue-500"
                    style={{
                      height: `${feedbackHeight}px`,
                      width: '100%',
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
          class="fixed z-50 bg-gray-900 text-white text-xs rounded px-3 py-2 shadow-lg pointer-events-none"
          style={{
            left: `${tooltip.x}px`,
            top: `${tooltip.y}px`,
            transform: 'translate(-50%, -100%)',
            maxWidth: '200px',
          }}
        >
          <div class="font-bold mb-1">{tooltip.version}</div>
          <div class="mb-1 text-gray-300">{tooltip.title}</div>
          <div class="text-gray-400">
            <div>Feedback: {tooltip.feedbackCount}</div>
            {tooltip.nodesDelta > 0 && <div>Nodes Changed: {tooltip.nodesDelta}</div>}
          </div>
        </div>
      )}

      <VerticalSpace space="extraSmall" />
      <Muted>
        <div class="text-xs">
          Showing {bars.length} most recent {bars.length === 1 ? 'commit' : 'commits'}. Click a bar to view in
          changelog.
        </div>
      </Muted>
    </div>
  );
}
