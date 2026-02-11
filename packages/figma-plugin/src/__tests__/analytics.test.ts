/**
 * Unit tests for changelog analytics functions
 */

import { describe, it, expect } from 'vitest';
import type { Commit } from '@figma-versioning/core';
import {
  analyzeFileGrowth,
  analyzeFrameChurn,
  classifyPeriods,
  analyzeMostActiveNodes,
  computeChangelogAnalytics,
} from '../changelog/analytics';
import { createMockCommit, createMockComment, createMockAnnotation } from './test-utils';

describe('Analytics - File Growth', () => {
  it('should detect growing trend with positive average growth rate', () => {
    const commits = [
      createMockCommit({
        id: 'commit-1',
        timestamp: new Date('2026-01-01'),
        metrics: {
          totalNodes: 10,
          frames: 1,
          components: 0,
          instances: 0,
          textNodes: 0,
          feedbackCount: 0,
        },
      }),
      createMockCommit({
        id: 'commit-2',
        timestamp: new Date('2026-01-02'),
        metrics: {
          totalNodes: 15,
          frames: 1,
          components: 0,
          instances: 0,
          textNodes: 0,
          feedbackCount: 0,
        },
      }),
      createMockCommit({
        id: 'commit-3',
        timestamp: new Date('2026-01-03'),
        metrics: {
          totalNodes: 25,
          frames: 1,
          components: 0,
          instances: 0,
          textNodes: 0,
          feedbackCount: 0,
        },
      }),
    ];

    const result = analyzeFileGrowth(commits);

    expect(result.trend).toBe('growing');
    expect(result.averageGrowthRate).toBe(7.5); // (25 - 10) / 2 commits
    expect(result.totalGrowth).toBe(15);
    expect(result.currentNodes).toBe(25);
    expect(result.initialNodes).toBe(10);
  });

  it('should detect shrinking trend with negative average growth rate', () => {
    const commits = [
      createMockCommit({
        id: 'commit-1',
        timestamp: new Date('2026-01-01'),
        metrics: {
          totalNodes: 100,
          frames: 1,
          components: 0,
          instances: 0,
          textNodes: 0,
          feedbackCount: 0,
        },
      }),
      createMockCommit({
        id: 'commit-2',
        timestamp: new Date('2026-01-02'),
        metrics: {
          totalNodes: 80,
          frames: 1,
          components: 0,
          instances: 0,
          textNodes: 0,
          feedbackCount: 0,
        },
      }),
      createMockCommit({
        id: 'commit-3',
        timestamp: new Date('2026-01-03'),
        metrics: {
          totalNodes: 60,
          frames: 1,
          components: 0,
          instances: 0,
          textNodes: 0,
          feedbackCount: 0,
        },
      }),
    ];

    const result = analyzeFileGrowth(commits);

    expect(result.trend).toBe('shrinking');
    expect(result.averageGrowthRate).toBe(-20); // (60 - 100) / 2
    expect(result.totalGrowth).toBe(-40);
  });

  it('should detect stable trend with minimal change', () => {
    const commits = [
      createMockCommit({
        id: 'commit-1',
        timestamp: new Date('2026-01-01'),
        metrics: {
          totalNodes: 100,
          frames: 1,
          components: 0,
          instances: 0,
          textNodes: 0,
          feedbackCount: 0,
        },
      }),
      createMockCommit({
        id: 'commit-2',
        timestamp: new Date('2026-01-02'),
        metrics: {
          totalNodes: 100,
          frames: 1,
          components: 0,
          instances: 0,
          textNodes: 0,
          feedbackCount: 0,
        },
      }),
      createMockCommit({
        id: 'commit-3',
        timestamp: new Date('2026-01-03'),
        metrics: {
          totalNodes: 101,
          frames: 1,
          components: 0,
          instances: 0,
          textNodes: 0,
          feedbackCount: 0,
        },
      }),
    ];

    const result = analyzeFileGrowth(commits);

    expect(result.trend).toBe('stable');
    expect(result.averageGrowthRate).toBe(0.5); // (101 - 100) / 2
  });

  it('should handle empty commits array', () => {
    const result = analyzeFileGrowth([]);

    expect(result.trend).toBe('stable');
    expect(result.averageGrowthRate).toBe(0);
    expect(result.totalGrowth).toBe(0);
    expect(result.currentNodes).toBe(0);
    expect(result.initialNodes).toBe(0);
  });

  it('should handle single commit', () => {
    const commits = [
      createMockCommit({
        id: 'commit-1',
        metrics: {
          totalNodes: 50,
          frames: 1,
          components: 0,
          instances: 0,
          textNodes: 0,
          feedbackCount: 0,
        },
      }),
    ];

    const result = analyzeFileGrowth(commits);

    expect(result.trend).toBe('stable');
    expect(result.averageGrowthRate).toBe(0);
    expect(result.totalGrowth).toBe(0);
    expect(result.currentNodes).toBe(50);
    expect(result.initialNodes).toBe(50);
  });
});

describe('Analytics - Frame Churn', () => {
  it('should calculate frame modifications per day', () => {
    const commits = [
      createMockCommit({
        id: 'commit-1',
        timestamp: new Date('2026-01-01'),
        metrics: {
          totalNodes: 10,
          frames: 5,
          components: 0,
          instances: 0,
          textNodes: 0,
          feedbackCount: 0,
        },
      }),
      createMockCommit({
        id: 'commit-2',
        timestamp: new Date('2026-01-02'),
        metrics: {
          totalNodes: 10,
          frames: 7,
          components: 0,
          instances: 0,
          textNodes: 0,
          feedbackCount: 0,
        },
      }),
      createMockCommit({
        id: 'commit-3',
        timestamp: new Date('2026-01-03'),
        metrics: {
          totalNodes: 10,
          frames: 8,
          components: 0,
          instances: 0,
          textNodes: 0,
          feedbackCount: 0,
        },
      }),
      createMockCommit({
        id: 'commit-4',
        timestamp: new Date('2026-01-05'),
        metrics: {
          totalNodes: 10,
          frames: 6,
          components: 0,
          instances: 0,
          textNodes: 0,
          feedbackCount: 0,
        },
      }),
    ];

    const result = analyzeFrameChurn(commits);

    // 3 frame changes over 4 days = 0.75 modifications per day
    expect(result.modificationsPerDay).toBe(0.75);
    expect(result.currentFrames).toBe(6);
    expect(result.peakFrames).toBe(8);
  });

  it('should handle no frame changes', () => {
    const commits = [
      createMockCommit({
        id: 'commit-1',
        timestamp: new Date('2026-01-01'),
        metrics: {
          totalNodes: 10,
          frames: 5,
          components: 0,
          instances: 0,
          textNodes: 0,
          feedbackCount: 0,
        },
      }),
      createMockCommit({
        id: 'commit-2',
        timestamp: new Date('2026-01-03'),
        metrics: {
          totalNodes: 10,
          frames: 5,
          components: 0,
          instances: 0,
          textNodes: 0,
          feedbackCount: 0,
        },
      }),
    ];

    const result = analyzeFrameChurn(commits);

    expect(result.modificationsPerDay).toBe(0);
    expect(result.currentFrames).toBe(5);
    expect(result.peakFrames).toBe(5);
  });

  it('should handle empty commits array', () => {
    const result = analyzeFrameChurn([]);

    expect(result.modificationsPerDay).toBe(0);
    expect(result.currentFrames).toBe(0);
    expect(result.peakFrames).toBe(0);
  });

  it('should handle single commit', () => {
    const commits = [
      createMockCommit({
        id: 'commit-1',
        metrics: {
          totalNodes: 10,
          frames: 5,
          components: 0,
          instances: 0,
          textNodes: 0,
          feedbackCount: 0,
        },
      }),
    ];

    const result = analyzeFrameChurn(commits);

    expect(result.modificationsPerDay).toBe(0);
    expect(result.currentFrames).toBe(5);
    expect(result.peakFrames).toBe(5);
  });
});

describe('Analytics - Period Classification', () => {
  it('should classify expansion period', () => {
    const commits = [
      createMockCommit({
        id: 'commit-1',
        timestamp: new Date('2026-01-01'),
        metrics: {
          totalNodes: 10,
          frames: 1,
          components: 0,
          instances: 0,
          textNodes: 0,
          feedbackCount: 0,
        },
      }),
      createMockCommit({
        id: 'commit-2',
        timestamp: new Date('2026-01-02'),
        metrics: {
          totalNodes: 20,
          frames: 1,
          components: 0,
          instances: 0,
          textNodes: 0,
          feedbackCount: 0,
        },
      }),
      createMockCommit({
        id: 'commit-3',
        timestamp: new Date('2026-01-03'),
        metrics: {
          totalNodes: 30,
          frames: 1,
          components: 0,
          instances: 0,
          textNodes: 0,
          feedbackCount: 0,
        },
      }),
      createMockCommit({
        id: 'commit-4',
        timestamp: new Date('2026-01-04'),
        metrics: {
          totalNodes: 40,
          frames: 1,
          components: 0,
          instances: 0,
          textNodes: 0,
          feedbackCount: 0,
        },
      }),
    ];

    const result = classifyPeriods(commits);

    expect(result.type).toBe('expansion');
    expect(result.expansionRate).toBe(100);
    expect(result.cleanupRate).toBe(0);
    expect(result.stableRate).toBe(0);
  });

  it('should classify cleanup period', () => {
    const commits = [
      createMockCommit({
        id: 'commit-1',
        timestamp: new Date('2026-01-01'),
        metrics: {
          totalNodes: 100,
          frames: 1,
          components: 0,
          instances: 0,
          textNodes: 0,
          feedbackCount: 0,
        },
      }),
      createMockCommit({
        id: 'commit-2',
        timestamp: new Date('2026-01-02'),
        metrics: {
          totalNodes: 80,
          frames: 1,
          components: 0,
          instances: 0,
          textNodes: 0,
          feedbackCount: 0,
        },
      }),
      createMockCommit({
        id: 'commit-3',
        timestamp: new Date('2026-01-03'),
        metrics: {
          totalNodes: 60,
          frames: 1,
          components: 0,
          instances: 0,
          textNodes: 0,
          feedbackCount: 0,
        },
      }),
    ];

    const result = classifyPeriods(commits);

    expect(result.type).toBe('cleanup');
    expect(result.expansionRate).toBe(0);
    expect(result.cleanupRate).toBe(100);
  });

  it('should classify stable period', () => {
    const commits = [
      createMockCommit({
        id: 'commit-1',
        timestamp: new Date('2026-01-01'),
        metrics: {
          totalNodes: 100,
          frames: 1,
          components: 0,
          instances: 0,
          textNodes: 0,
          feedbackCount: 0,
        },
      }),
      createMockCommit({
        id: 'commit-2',
        timestamp: new Date('2026-01-02'),
        metrics: {
          totalNodes: 101,
          frames: 1,
          components: 0,
          instances: 0,
          textNodes: 0,
          feedbackCount: 0,
        },
      }),
      createMockCommit({
        id: 'commit-3',
        timestamp: new Date('2026-01-03'),
        metrics: {
          totalNodes: 102,
          frames: 1,
          components: 0,
          instances: 0,
          textNodes: 0,
          feedbackCount: 0,
        },
      }),
      createMockCommit({
        id: 'commit-4',
        timestamp: new Date('2026-01-04'),
        metrics: {
          totalNodes: 101,
          frames: 1,
          components: 0,
          instances: 0,
          textNodes: 0,
          feedbackCount: 0,
        },
      }),
    ];

    const result = classifyPeriods(commits);

    expect(result.type).toBe('stable');
    expect(result.stableRate).toBeGreaterThan(50);
  });

  it('should classify mixed period', () => {
    const commits = [
      createMockCommit({
        id: 'commit-1',
        timestamp: new Date('2026-01-01'),
        metrics: {
          totalNodes: 100,
          frames: 1,
          components: 0,
          instances: 0,
          textNodes: 0,
          feedbackCount: 0,
        },
      }),
      createMockCommit({
        id: 'commit-2',
        timestamp: new Date('2026-01-02'),
        metrics: {
          totalNodes: 120,
          frames: 1,
          components: 0,
          instances: 0,
          textNodes: 0,
          feedbackCount: 0,
        },
      }),
      createMockCommit({
        id: 'commit-3',
        timestamp: new Date('2026-01-03'),
        metrics: {
          totalNodes: 90,
          frames: 1,
          components: 0,
          instances: 0,
          textNodes: 0,
          feedbackCount: 0,
        },
      }),
      createMockCommit({
        id: 'commit-4',
        timestamp: new Date('2026-01-04'),
        metrics: {
          totalNodes: 110,
          frames: 1,
          components: 0,
          instances: 0,
          textNodes: 0,
          feedbackCount: 0,
        },
      }),
    ];

    const result = classifyPeriods(commits);

    expect(result.type).toBe('mixed');
    expect(result.expansionRate + result.cleanupRate + result.stableRate).toBeCloseTo(100);
  });

  it('should handle empty commits array', () => {
    const result = classifyPeriods([]);

    expect(result.type).toBe('stable');
    expect(result.expansionRate).toBe(0);
    expect(result.cleanupRate).toBe(0);
    expect(result.stableRate).toBe(100);
    expect(result.totalCommits).toBe(0);
  });
});

describe('Analytics - Most Active Nodes', () => {
  it('should identify hotspot nodes from comments and annotations', () => {
    const commits = [
      createMockCommit({
        id: 'commit-1',
        comments: [
          createMockComment({ nodeId: 'node-1' }),
          createMockComment({ nodeId: 'node-1' }),
          createMockComment({ nodeId: 'node-2' }),
        ],
        annotations: [createMockAnnotation({ nodeId: 'node-1' })],
      }),
      createMockCommit({
        id: 'commit-2',
        comments: [createMockComment({ nodeId: 'node-1' })],
        annotations: [
          createMockAnnotation({ nodeId: 'node-2' }),
          createMockAnnotation({ nodeId: 'node-3' }),
        ],
      }),
    ];

    const result = analyzeMostActiveNodes(commits);

    expect(result.totalActiveNodes).toBe(3);
    expect(result.hotspots).toHaveLength(3);

    // node-1 should be the top hotspot (4 activities)
    expect(result.hotspots[0].nodeId).toBe('node-1');
    expect(result.hotspots[0].activityCount).toBe(4);
    expect(result.hotspots[0].commitCount).toBe(2);

    // node-2 should be second (2 activities)
    expect(result.hotspots[1].nodeId).toBe('node-2');
    expect(result.hotspots[1].activityCount).toBe(2);
  });

  it('should limit analysis to last N commits', () => {
    const commits = [
      createMockCommit({
        id: 'commit-1',
        timestamp: new Date('2026-01-01'),
        comments: [createMockComment({ nodeId: 'node-1' })],
      }),
      createMockCommit({
        id: 'commit-2',
        timestamp: new Date('2026-01-02'),
        comments: [createMockComment({ nodeId: 'node-2' })],
      }),
      createMockCommit({
        id: 'commit-3',
        timestamp: new Date('2026-01-03'),
        comments: [createMockComment({ nodeId: 'node-3' })],
      }),
    ];

    const result = analyzeMostActiveNodes(commits, 2);

    // Should only analyze last 2 commits
    expect(result.totalActiveNodes).toBe(2);
    expect(result.hotspots.some(h => h.nodeId === 'node-1')).toBe(false);
  });

  it('should ignore comments without nodeId', () => {
    const commits = [
      createMockCommit({
        id: 'commit-1',
        comments: [
          createMockComment({ nodeId: 'node-1' }),
          createMockComment({ nodeId: undefined }),
        ],
      }),
    ];

    const result = analyzeMostActiveNodes(commits);

    expect(result.totalActiveNodes).toBe(1);
    expect(result.hotspots[0].nodeId).toBe('node-1');
    expect(result.hotspots[0].activityCount).toBe(1);
  });

  it('should handle empty commits array', () => {
    const result = analyzeMostActiveNodes([]);

    expect(result.totalActiveNodes).toBe(0);
    expect(result.hotspots).toHaveLength(0);
  });

  it('should handle commits with no comments or annotations', () => {
    const commits = [
      createMockCommit({
        id: 'commit-1',
        comments: [],
        annotations: [],
      }),
    ];

    const result = analyzeMostActiveNodes(commits);

    expect(result.totalActiveNodes).toBe(0);
    expect(result.hotspots).toHaveLength(0);
  });
});

describe('Analytics - Combined Analytics', () => {
  it('should compute all analytics at once', () => {
    const commits = [
      createMockCommit({
        id: 'commit-1',
        timestamp: new Date('2026-01-01'),
        metrics: {
          totalNodes: 10,
          frames: 5,
          components: 0,
          instances: 0,
          textNodes: 0,
          feedbackCount: 0,
        },
        comments: [createMockComment({ nodeId: 'node-1' })],
      }),
      createMockCommit({
        id: 'commit-2',
        timestamp: new Date('2026-01-02'),
        metrics: {
          totalNodes: 20,
          frames: 7,
          components: 0,
          instances: 0,
          textNodes: 0,
          feedbackCount: 0,
        },
        comments: [createMockComment({ nodeId: 'node-1' })],
      }),
    ];

    const result = computeChangelogAnalytics(commits);

    expect(result.fileGrowth).toBeDefined();
    expect(result.frameChurn).toBeDefined();
    expect(result.periodClassification).toBeDefined();
    expect(result.activeNodes).toBeDefined();

    expect(result.fileGrowth.trend).toBe('growing');
    expect(result.frameChurn.currentFrames).toBe(7);
    expect(result.periodClassification.type).toBe('expansion');
    expect(result.activeNodes.totalActiveNodes).toBe(1);
  });

  it('should respect recentCommitsForNodes option', () => {
    const commits = [
      createMockCommit({
        id: 'commit-1',
        timestamp: new Date('2026-01-01'),
        comments: [createMockComment({ nodeId: 'node-1' })],
      }),
      createMockCommit({
        id: 'commit-2',
        timestamp: new Date('2026-01-02'),
        comments: [createMockComment({ nodeId: 'node-2' })],
      }),
    ];

    const result = computeChangelogAnalytics(commits, {
      recentCommitsForNodes: 1,
    });

    // Should only analyze last 1 commit for active nodes
    expect(result.activeNodes.totalActiveNodes).toBe(1);
    expect(result.activeNodes.hotspots[0].nodeId).toBe('node-2');
  });
});
