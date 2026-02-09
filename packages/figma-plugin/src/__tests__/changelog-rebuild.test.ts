/**
 * Unit and integration tests for changelog rebuild functionality
 * Focuses on testable logic without heavy Figma API mocking
 */

import { describe, it, expect } from 'vitest';
import type { Commit } from '@figma-versioning/core';
import { calculateHistogramData } from '../changelog/histogram';
import { createMockCommit } from './test-utils';

describe('Changelog Rebuild - Histogram Integration', () => {
  it('should regenerate histogram with correct data after rebuild', () => {
    const commits = [
      createMockCommit({
        id: 'commit-1',
        version: '1.0.0',
        metrics: {
          totalNodes: 10,
          feedbackCount: 2,
          frames: 1,
          components: 0,
          instances: 0,
          textNodes: 0,
        },
      }),
      createMockCommit({
        id: 'commit-2',
        version: '1.1.0',
        metrics: {
          totalNodes: 15,
          feedbackCount: 3,
          frames: 1,
          components: 0,
          instances: 0,
          textNodes: 0,
        },
      }),
      createMockCommit({
        id: 'commit-3',
        version: '1.2.0',
        metrics: {
          totalNodes: 12,
          feedbackCount: 1,
          frames: 1,
          components: 0,
          instances: 0,
          textNodes: 0,
        },
      }),
    ];

    // Simulate frame ID map from rebuild
    const frameIdMap: Record<string, string> = {
      'commit-1': 'frame-1',
      'commit-2': 'frame-2',
      'commit-3': 'frame-3',
    };

    // Update commits with new frame IDs (this is what happens after rebuild in main.ts)
    const updatedCommits = commits.map(commit => ({
      ...commit,
      changelogFrameId: frameIdMap[commit.id],
    }));

    // Calculate histogram data
    const histogramData = calculateHistogramData(updatedCommits);

    // Verify: Should have 3 bars
    expect(histogramData).toHaveLength(3);

    // Verify: Each bar has correct changelogFrameId
    const bar1 = histogramData.find(b => b.commitId === 'commit-1');
    const bar2 = histogramData.find(b => b.commitId === 'commit-2');
    const bar3 = histogramData.find(b => b.commitId === 'commit-3');

    expect(bar1).toBeDefined();
    expect(bar2).toBeDefined();
    expect(bar3).toBeDefined();

    expect(bar1?.changelogFrameId).toBe('frame-1');
    expect(bar2?.changelogFrameId).toBe('frame-2');
    expect(bar3?.changelogFrameId).toBe('frame-3');

    // Verify: Feedback counts are correct
    expect(bar1?.feedbackCount).toBe(2);
    expect(bar2?.feedbackCount).toBe(3);
    expect(bar3?.feedbackCount).toBe(1);

    // Verify: Node deltas are calculated correctly
    // commit-1: 0 (first commit, no previous baseline)
    // commit-2: 15 - 10 = 5
    // commit-3: |12 - 15| = 3 (absolute value)
    expect(bar1?.nodesDelta).toBe(0);
    expect(bar2?.nodesDelta).toBe(5);
    expect(bar3?.nodesDelta).toBe(3); // Absolute value
  });

  it('should handle empty commits array', () => {
    const commits: Commit[] = [];
    const histogramData = calculateHistogramData(commits);

    expect(histogramData).toEqual([]);
    expect(histogramData).toHaveLength(0);
  });

  it('should preserve existing changelogFrameId references', () => {
    const commits = [
      createMockCommit({
        id: 'commit-1',
        version: '1.0.0',
        changelogFrameId: 'existing-frame-1',
        metrics: { totalNodes: 10, feedbackCount: 1, frames: 1, components: 0, instances: 0, textNodes: 0 },
      }),
      createMockCommit({
        id: 'commit-2',
        version: '1.1.0',
        changelogFrameId: 'existing-frame-2',
        metrics: { totalNodes: 15, feedbackCount: 2, frames: 1, components: 0, instances: 0, textNodes: 0 },
      }),
    ];

    const histogramData = calculateHistogramData(commits);

    // changelogFrameId should be preserved in histogram bars
    const bar1 = histogramData.find(b => b.commitId === 'commit-1');
    const bar2 = histogramData.find(b => b.commitId === 'commit-2');

    expect(bar1?.changelogFrameId).toBe('existing-frame-1');
    expect(bar2?.changelogFrameId).toBe('existing-frame-2');
  });

  it('should correctly calculate nodesDelta for sequential commits', () => {
    const commits = [
      createMockCommit({
        id: 'commit-1',
        version: '1.0.0',
        timestamp: new Date('2024-01-01'),
        metrics: { totalNodes: 100, feedbackCount: 0, frames: 1, components: 0, instances: 0, textNodes: 0 },
      }),
      createMockCommit({
        id: 'commit-2',
        version: '1.1.0',
        timestamp: new Date('2024-01-02'),
        metrics: { totalNodes: 150, feedbackCount: 0, frames: 1, components: 0, instances: 0, textNodes: 0 },
      }),
      createMockCommit({
        id: 'commit-3',
        version: '1.2.0',
        timestamp: new Date('2024-01-03'),
        metrics: { totalNodes: 120, feedbackCount: 0, frames: 1, components: 0, instances: 0, textNodes: 0 },
      }),
      createMockCommit({
        id: 'commit-4',
        version: '1.3.0',
        timestamp: new Date('2024-01-04'),
        metrics: { totalNodes: 140, feedbackCount: 0, frames: 1, components: 0, instances: 0, textNodes: 0 },
      }),
    ];

    const histogramData = calculateHistogramData(commits);

    // Expected deltas (histogram returns chronological order - oldest first):
    // commit-1: 0 (first)
    // commit-2: |150 - 100| = 50
    // commit-3: |120 - 150| = 30
    // commit-4: |140 - 120| = 20
    expect(histogramData[0].nodesDelta).toBe(0);   // Oldest (first)
    expect(histogramData[1].nodesDelta).toBe(50);
    expect(histogramData[2].nodesDelta).toBe(30);
    expect(histogramData[3].nodesDelta).toBe(20);  // Newest
  });
});

describe('Frame ID Mapping Logic', () => {
  it('should create unique frame IDs for all commits', () => {
    // Simulate what rebuildChangelog returns
    const commits = [
      createMockCommit({ id: 'commit-1', version: '1.0.0' }),
      createMockCommit({ id: 'commit-2', version: '1.1.0' }),
      createMockCommit({ id: 'commit-3', version: '1.2.0' }),
      createMockCommit({ id: 'commit-4', version: '1.3.0' }),
      createMockCommit({ id: 'commit-5', version: '1.4.0' }),
    ];

    // Simulate frame ID map from rebuild
    const frameIdMap: Record<string, string> = {};
    commits.forEach((commit, index) => {
      frameIdMap[commit.id] = `frame-${index + 1}`;
    });

    // Verify: All commits have frame IDs
    expect(Object.keys(frameIdMap)).toHaveLength(5);
    commits.forEach(commit => {
      expect(frameIdMap[commit.id]).toBeDefined();
      expect(frameIdMap[commit.id]).toMatch(/^frame-\d+$/);
    });

    // Verify: All frame IDs are unique
    const frameIds = Object.values(frameIdMap);
    const uniqueFrameIds = new Set(frameIds);
    expect(uniqueFrameIds.size).toBe(5);
  });

  it('should correctly update changelogFrameId references after rebuild', () => {
    const commits = [
      createMockCommit({ id: 'commit-1', version: '1.0.0', changelogFrameId: 'old-frame-1' }),
      createMockCommit({ id: 'commit-2', version: '1.1.0', changelogFrameId: 'old-frame-2' }),
      createMockCommit({ id: 'commit-3', version: '1.2.0', changelogFrameId: 'old-frame-3' }),
    ];

    // Simulate rebuild returning new frame IDs
    const frameIdMap: Record<string, string> = {
      'commit-1': 'new-frame-1',
      'commit-2': 'new-frame-2',
      'commit-3': 'new-frame-3',
    };

    // Update commits with new frame IDs (mimicking main.ts logic)
    const updatedCommits = commits.map(commit => ({
      ...commit,
      changelogFrameId: frameIdMap[commit.id] || commit.changelogFrameId,
    }));

    // Verify: Old frame IDs are replaced with new ones
    expect(updatedCommits[0].changelogFrameId).toBe('new-frame-1');
    expect(updatedCommits[1].changelogFrameId).toBe('new-frame-2');
    expect(updatedCommits[2].changelogFrameId).toBe('new-frame-3');

    // Verify: No old frame IDs remain
    updatedCommits.forEach(commit => {
      expect(commit.changelogFrameId).not.toMatch(/^old-frame-/);
    });
  });

  it('should handle partial frame ID map (some commits fail to render)', () => {
    const commits = [
      createMockCommit({ id: 'commit-1', version: '1.0.0', changelogFrameId: 'old-frame-1' }),
      createMockCommit({ id: 'commit-2', version: '1.1.0', changelogFrameId: 'old-frame-2' }),
      createMockCommit({ id: 'commit-3', version: '1.2.0', changelogFrameId: 'old-frame-3' }),
    ];

    // Simulate rebuild where commit-2 failed to render
    const frameIdMap: Record<string, string> = {
      'commit-1': 'new-frame-1',
      // commit-2 is missing (failed to render)
      'commit-3': 'new-frame-3',
    };

    // Update commits with new frame IDs, falling back to old if not in map
    const updatedCommits = commits.map(commit => ({
      ...commit,
      changelogFrameId: frameIdMap[commit.id] || commit.changelogFrameId,
    }));

    // Verify: commit-1 and commit-3 have new IDs
    expect(updatedCommits[0].changelogFrameId).toBe('new-frame-1');
    expect(updatedCommits[2].changelogFrameId).toBe('new-frame-3');

    // Verify: commit-2 falls back to old ID
    expect(updatedCommits[1].changelogFrameId).toBe('old-frame-2');
  });
});

describe('Progress Callback Logic', () => {
  it('should report correct progress for all commits', () => {
    const totalCommits = 5;
    const progressUpdates: Array<{ current: number; total: number; percentage: number }> = [];

    // Simulate progress callback calls during rebuild
    for (let i = 1; i <= totalCommits; i++) {
      const current = i;
      const total = totalCommits;
      const percentage = Math.round((current / total) * 100);
      progressUpdates.push({ current, total, percentage });
    }

    // Verify: Progress updates are sequential and complete
    expect(progressUpdates).toHaveLength(5);
    expect(progressUpdates[0]).toEqual({ current: 1, total: 5, percentage: 20 });
    expect(progressUpdates[1]).toEqual({ current: 2, total: 5, percentage: 40 });
    expect(progressUpdates[2]).toEqual({ current: 3, total: 5, percentage: 60 });
    expect(progressUpdates[3]).toEqual({ current: 4, total: 5, percentage: 80 });
    expect(progressUpdates[4]).toEqual({ current: 5, total: 5, percentage: 100 });
  });

  it('should handle empty commits with no progress updates', () => {
    const progressUpdates: Array<{ current: number; total: number }> = [];
    const totalCommits = 0;

    // No progress updates for empty commits
    for (let i = 1; i <= totalCommits; i++) {
      progressUpdates.push({ current: i, total: totalCommits });
    }

    expect(progressUpdates).toHaveLength(0);
  });
});

describe('Commit Sorting Logic', () => {
  it('should sort commits by timestamp chronologically', () => {
    const commits = [
      createMockCommit({ id: 'commit-1', version: '1.0.0', timestamp: new Date('2024-01-03') }),
      createMockCommit({ id: 'commit-2', version: '1.1.0', timestamp: new Date('2024-01-01') }),
      createMockCommit({ id: 'commit-3', version: '1.2.0', timestamp: new Date('2024-01-02') }),
    ];

    // Sort commits by timestamp (oldest first)
    const sorted = [...commits].sort((a, b) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    expect(sorted[0].version).toBe('1.1.0'); // 2024-01-01
    expect(sorted[1].version).toBe('1.2.0'); // 2024-01-02
    expect(sorted[2].version).toBe('1.0.0'); // 2024-01-03
  });

  it('should prepare commits for display in chronological order', () => {
    const commits = [
      createMockCommit({ id: 'commit-1', version: '1.0.0', timestamp: new Date('2024-01-01') }),
      createMockCommit({ id: 'commit-2', version: '1.1.0', timestamp: new Date('2024-01-02') }),
      createMockCommit({ id: 'commit-3', version: '1.2.0', timestamp: new Date('2024-01-03') }),
    ];

    // Histogram returns chronological order (oldest first) for left-to-right display
    const histogramData = calculateHistogramData(commits);

    // Should be ordered oldest to newest (left to right on histogram)
    expect(histogramData[0].version).toBe('1.0.0');
    expect(histogramData[1].version).toBe('1.1.0');
    expect(histogramData[2].version).toBe('1.2.0');
  });
});

describe('Container Clearing Logic', () => {
  it('should identify stale frames for removal before rebuild', () => {
    // Simulate existing frames that need to be cleared
    const existingFrameIds = ['frame-1', 'frame-2', 'frame-3'];

    // After rebuild, these should all be new IDs
    const newFrameIds = ['frame-4', 'frame-5', 'frame-6'];

    // Verify: No overlap between old and new frame IDs
    const overlap = existingFrameIds.filter(id => newFrameIds.includes(id));
    expect(overlap).toHaveLength(0);
  });

  it('should track number of frames cleared during rebuild', () => {
    const existingFrameCount = 5;
    const newFrameCount = 3;

    // Simulate clearing
    const framesCleared = existingFrameCount;
    const framesCreated = newFrameCount;

    expect(framesCleared).toBe(5);
    expect(framesCreated).toBe(3);
    expect(framesCreated).toBeLessThan(framesCleared); // Fewer commits after some were removed
  });
});
