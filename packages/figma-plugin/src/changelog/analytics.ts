/**
 * Analytics Module for Changelog Insights
 *
 * Computes trend analysis and insights from commit history without storing additional data.
 * All analytics are computed on-demand for performance.
 */

import type { Commit } from '@figma-versioning/core';

/**
 * File growth analysis result
 */
export interface FileGrowthAnalysis {
  /** Overall trend: 'growing' | 'shrinking' | 'stable' */
  trend: 'growing' | 'shrinking' | 'stable';
  /** Average growth rate (nodes per commit) */
  averageGrowthRate: number;
  /** Total node count change from first to last commit */
  totalGrowth: number;
  /** Current total node count */
  currentNodes: number;
  /** Initial node count (from first commit) */
  initialNodes: number;
}

/**
 * Frame churn analysis result
 */
export interface FrameChurnAnalysis {
  /** Average frame modifications per day */
  modificationsPerDay: number;
  /** Most volatile frame count period (highest stddev) */
  mostVolatilePeriod?: {
    startVersion: string;
    endVersion: string;
    volatility: number;
  };
  /** Current frame count */
  currentFrames: number;
  /** Peak frame count */
  peakFrames: number;
}

/**
 * Period classification for commit history
 */
export type PeriodType = 'expansion' | 'cleanup' | 'stable' | 'mixed';

export interface PeriodClassification {
  /** Overall period type */
  type: PeriodType;
  /** Percentage of commits with growth */
  expansionRate: number;
  /** Percentage of commits with reduction */
  cleanupRate: number;
  /** Percentage of commits with minimal change */
  stableRate: number;
  /** Number of commits analyzed */
  totalCommits: number;
}

/**
 * Activity hotspot (node or frame with high activity)
 */
export interface ActivityHotspot {
  /** Node ID */
  nodeId: string;
  /** Number of comments/annotations referencing this node */
  activityCount: number;
  /** Number of commits this node appears in */
  commitCount: number;
}

/**
 * Most active nodes analysis
 */
export interface MostActiveNodesAnalysis {
  /** Top hotspot nodes by activity */
  hotspots: ActivityHotspot[];
  /** Total unique nodes with activity */
  totalActiveNodes: number;
}

/**
 * Analyzes file growth over time from commit history
 *
 * @param commits - Array of commits to analyze
 * @returns File growth analysis with trend and rates
 */
export function analyzeFileGrowth(commits: Commit[]): FileGrowthAnalysis {
  if (commits.length === 0) {
    return {
      trend: 'stable',
      averageGrowthRate: 0,
      totalGrowth: 0,
      currentNodes: 0,
      initialNodes: 0,
    };
  }

  // Sort commits chronologically
  const sorted = [...commits].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const firstCommit = sorted[0];
  const lastCommit = sorted[sorted.length - 1];

  const initialNodes = firstCommit.metrics.totalNodes;
  const currentNodes = lastCommit.metrics.totalNodes;
  const totalGrowth = currentNodes - initialNodes;

  // Calculate average growth rate (nodes per commit)
  const averageGrowthRate = commits.length > 1 ? totalGrowth / (commits.length - 1) : 0;

  // Determine trend
  let trend: 'growing' | 'shrinking' | 'stable';
  if (Math.abs(averageGrowthRate) < 1) {
    trend = 'stable';
  } else if (averageGrowthRate > 0) {
    trend = 'growing';
  } else {
    trend = 'shrinking';
  }

  return {
    trend,
    averageGrowthRate: Number(averageGrowthRate.toFixed(2)),
    totalGrowth,
    currentNodes,
    initialNodes,
  };
}

/**
 * Analyzes frame churn rate from commit history
 *
 * @param commits - Array of commits to analyze
 * @returns Frame churn analysis with modification rates
 */
export function analyzeFrameChurn(commits: Commit[]): FrameChurnAnalysis {
  if (commits.length === 0) {
    return {
      modificationsPerDay: 0,
      currentFrames: 0,
      peakFrames: 0,
    };
  }

  // Sort commits chronologically
  const sorted = [...commits].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const firstCommit = sorted[0];
  const lastCommit = sorted[sorted.length - 1];
  const currentFrames = lastCommit.metrics.frames;
  const peakFrames = Math.max(...sorted.map(c => c.metrics.frames));

  // Calculate time span in days
  const timeSpanMs = lastCommit.timestamp.getTime() - firstCommit.timestamp.getTime();
  const timeSpanDays = Math.max(1, timeSpanMs / (1000 * 60 * 60 * 24));

  // Count frame changes
  let frameChanges = 0;
  for (let i = 1; i < sorted.length; i++) {
    const prevFrames = sorted[i - 1].metrics.frames;
    const currFrames = sorted[i].metrics.frames;
    if (prevFrames !== currFrames) {
      frameChanges++;
    }
  }

  const modificationsPerDay = frameChanges / timeSpanDays;

  return {
    modificationsPerDay: Number(modificationsPerDay.toFixed(2)),
    currentFrames,
    peakFrames,
  };
}

/**
 * Classifies the overall period type based on commit activity
 *
 * @param commits - Array of commits to analyze
 * @returns Period classification
 */
export function classifyPeriods(commits: Commit[]): PeriodClassification {
  if (commits.length === 0) {
    return {
      type: 'stable',
      expansionRate: 0,
      cleanupRate: 0,
      stableRate: 100,
      totalCommits: 0,
    };
  }

  // Sort commits chronologically
  const sorted = [...commits].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  let expansionCount = 0;
  let cleanupCount = 0;
  let stableCount = 0;

  // Threshold for "stable" (less than 5% change)
  const STABLE_THRESHOLD = 0.05;

  for (let i = 1; i < sorted.length; i++) {
    const prevNodes = sorted[i - 1].metrics.totalNodes;
    const currNodes = sorted[i].metrics.totalNodes;
    const delta = currNodes - prevNodes;
    const percentChange = prevNodes > 0 ? Math.abs(delta) / prevNodes : 0;

    if (percentChange < STABLE_THRESHOLD) {
      stableCount++;
    } else if (delta > 0) {
      expansionCount++;
    } else {
      cleanupCount++;
    }
  }

  const totalCommits = commits.length;
  const totalAnalyzed = Math.max(1, sorted.length - 1);

  const expansionRate = Number(((expansionCount / totalAnalyzed) * 100).toFixed(1));
  const cleanupRate = Number(((cleanupCount / totalAnalyzed) * 100).toFixed(1));
  const stableRate = Number(((stableCount / totalAnalyzed) * 100).toFixed(1));

  // Determine overall type
  // Mixed: significant activity in multiple directions (both expansion and cleanup > 25%)
  // Otherwise: clear majority required (>60%)
  let type: PeriodType;
  const CLEAR_MAJORITY_THRESHOLD = 60;
  const SIGNIFICANT_ACTIVITY_THRESHOLD = 25;

  const hasSignificantExpansion = expansionRate > SIGNIFICANT_ACTIVITY_THRESHOLD;
  const hasSignificantCleanup = cleanupRate > SIGNIFICANT_ACTIVITY_THRESHOLD;

  if (hasSignificantExpansion && hasSignificantCleanup) {
    // Both expansion and cleanup are significant -> mixed
    type = 'mixed';
  } else if (expansionRate > CLEAR_MAJORITY_THRESHOLD) {
    type = 'expansion';
  } else if (cleanupRate > CLEAR_MAJORITY_THRESHOLD) {
    type = 'cleanup';
  } else if (stableRate > CLEAR_MAJORITY_THRESHOLD) {
    type = 'stable';
  } else {
    type = 'mixed';
  }

  return {
    type,
    expansionRate,
    cleanupRate,
    stableRate,
    totalCommits,
  };
}

/**
 * Analyzes most active nodes based on comments and annotations
 *
 * @param commits - Array of commits to analyze
 * @param lastN - Optional: analyze only the last N commits
 * @returns Most active nodes analysis
 */
export function analyzeMostActiveNodes(
  commits: Commit[],
  lastN?: number
): MostActiveNodesAnalysis {
  if (commits.length === 0) {
    return {
      hotspots: [],
      totalActiveNodes: 0,
    };
  }

  // Take last N commits if specified
  const sorted = [...commits].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
  const commitsToAnalyze = lastN ? sorted.slice(0, lastN) : sorted;

  // Track activity by nodeId
  const nodeActivity = new Map<string, { count: number; commitIds: Set<string> }>();

  for (const commit of commitsToAnalyze) {
    // Count comments with nodeId
    for (const comment of commit.comments) {
      if (comment.nodeId) {
        const existing = nodeActivity.get(comment.nodeId) || {
          count: 0,
          commitIds: new Set(),
        };
        existing.count++;
        existing.commitIds.add(commit.id);
        nodeActivity.set(comment.nodeId, existing);
      }
    }

    // Count annotations
    for (const annotation of commit.annotations) {
      const existing = nodeActivity.get(annotation.nodeId) || {
        count: 0,
        commitIds: new Set(),
      };
      existing.count++;
      existing.commitIds.add(commit.id);
      nodeActivity.set(annotation.nodeId, existing);
    }
  }

  // Convert to hotspots and sort by activity count
  const hotspots: ActivityHotspot[] = Array.from(nodeActivity.entries())
    .map(([nodeId, data]) => ({
      nodeId,
      activityCount: data.count,
      commitCount: data.commitIds.size,
    }))
    .sort((a, b) => b.activityCount - a.activityCount);

  return {
    hotspots,
    totalActiveNodes: nodeActivity.size,
  };
}

/**
 * Combined analytics result for easy UI integration
 */
export interface ChangelogAnalytics {
  fileGrowth: FileGrowthAnalysis;
  frameChurn: FrameChurnAnalysis;
  periodClassification: PeriodClassification;
  activeNodes: MostActiveNodesAnalysis;
}

/**
 * Computes all analytics at once with optional caching
 *
 * @param commits - Array of commits to analyze
 * @param options - Optional configuration
 * @returns Combined analytics result
 */
export function computeChangelogAnalytics(
  commits: Commit[],
  options?: {
    /** Number of recent commits to analyze for active nodes (default: all) */
    recentCommitsForNodes?: number;
  }
): ChangelogAnalytics {
  return {
    fileGrowth: analyzeFileGrowth(commits),
    frameChurn: analyzeFrameChurn(commits),
    periodClassification: classifyPeriods(commits),
    activeNodes: analyzeMostActiveNodes(commits, options?.recentCommitsForNodes),
  };
}
