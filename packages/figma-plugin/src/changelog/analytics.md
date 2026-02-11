# Changelog Analytics Module

Provides on-demand trend analysis and insights computed from commit history without storing additional data.

## Features

### 1. File Growth Analysis

Analyzes overall file growth trend and rates:

```typescript
import { analyzeFileGrowth } from './changelog/analytics';

const result = analyzeFileGrowth(commits);
// {
//   trend: 'growing' | 'shrinking' | 'stable',
//   averageGrowthRate: 7.5,  // nodes per commit
//   totalGrowth: 150,
//   currentNodes: 200,
//   initialNodes: 50
// }
```

### 2. Frame Churn Analysis

Tracks frame modifications over time:

```typescript
import { analyzeFrameChurn } from './changelog/analytics';

const result = analyzeFrameChurn(commits);
// {
//   modificationsPerDay: 2.5,
//   currentFrames: 25,
//   peakFrames: 30
// }
```

### 3. Period Classification

Classifies commit history by activity type:

```typescript
import { classifyPeriods } from './changelog/analytics';

const result = classifyPeriods(commits);
// {
//   type: 'expansion' | 'cleanup' | 'stable' | 'mixed',
//   expansionRate: 66.7,
//   cleanupRate: 20.0,
//   stableRate: 13.3,
//   totalCommits: 30
// }
```

**Classification Rules:**
- **Mixed**: Both expansion and cleanup rates > 25%
- **Expansion/Cleanup/Stable**: Type rate > 60%
- Otherwise: **Mixed**

### 4. Most Active Nodes

Identifies hotspot nodes with high comment/annotation activity:

```typescript
import { analyzeMostActiveNodes } from './changelog/analytics';

const result = analyzeMostActiveNodes(commits, 10); // last 10 commits
// {
//   hotspots: [
//     { nodeId: 'node-1', activityCount: 15, commitCount: 5 },
//     { nodeId: 'node-2', activityCount: 8, commitCount: 3 }
//   ],
//   totalActiveNodes: 12
// }
```

### 5. Combined Analytics

Compute all analytics at once:

```typescript
import { computeChangelogAnalytics } from './changelog/analytics';

const analytics = computeChangelogAnalytics(commits, {
  recentCommitsForNodes: 20 // optional: limit active nodes analysis
});
// {
//   fileGrowth: FileGrowthAnalysis,
//   frameChurn: FrameChurnAnalysis,
//   periodClassification: PeriodClassification,
//   activeNodes: MostActiveNodesAnalysis
// }
```

## Performance

- All analytics are computed on-demand (not stored)
- Estimated compute time: 50-500ms depending on commit history size
- Recommendation: Cache results in-memory for UI display

## Integration

The analytics module is exported from the main changelog module:

```typescript
import {
  analyzeFileGrowth,
  analyzeFrameChurn,
  classifyPeriods,
  analyzeMostActiveNodes,
  computeChangelogAnalytics,
  type ChangelogAnalytics
} from './changelog';
```

## Next Steps

See Phase 3.2 (figma-versioning-67d) for UI integration of these analytics.
