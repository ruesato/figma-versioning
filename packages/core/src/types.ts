/**
 * Core type definitions for Figma versioning
 */

/**
 * Versioning mode for the plugin
 */
export type VersioningMode = 'semantic' | 'date-based';

/**
 * Semantic version increment type
 */
export type VersionIncrement = 'major' | 'minor' | 'patch';

/**
 * Author information for commits and comments
 */
export interface Author {
  name: string;
  email?: string;
}

/**
 * Figma comment captured at commit time
 */
export interface Comment {
  /** Unique comment ID from Figma API */
  id: string;
  /** Comment author */
  author: Author;
  /** Comment creation timestamp */
  timestamp: Date;
  /** Comment text content */
  text: string;
  /** Associated Figma node ID if comment is pinned to a specific node */
  nodeId?: string;
  /** Parent comment ID if this is a reply (undefined for root comments) */
  parentId?: string;
}

/**
 * Dev Mode annotation captured at commit time
 */
export interface Annotation {
  /** Label text from the annotation */
  label: string;
  /** Associated Figma node ID */
  nodeId: string;
  /** Whether the annotation is pinned */
  isPinned: boolean;
  /** Additional properties from the annotation */
  properties?: Record<string, unknown>;
}

/**
 * Activity metrics for a commit
 */
export interface CommitMetrics {
  /** Total node count at commit time */
  totalNodes: number;
  /** Number of frame nodes */
  frames: number;
  /** Number of component nodes */
  components: number;
  /** Number of instance nodes */
  instances: number;
  /** Number of text nodes */
  textNodes: number;
  /** Net change in total node count from previous commit */
  nodesDelta?: number;
  /** Number of comments and annotations in this commit */
  feedbackCount: number;
  /** Change in feedback count from previous commit */
  feedbackDelta?: number;
}

/**
 * Complete commit record with all captured data
 */
export interface Commit {
  /** Unique commit identifier */
  id: string;
  /** Version string (semantic like "1.2.3" or date-based like "2026-01-15") */
  version: string;
  /** Commit title - short summary of changes (required) */
  title: string;
  /** Commit description - detailed explanation of what changed (optional) */
  description?: string;
  /** Commit author */
  author: Author;
  /** Commit creation timestamp */
  timestamp: Date;
  /** Comments captured since previous commit */
  comments: Comment[];
  /** Annotations captured from current page */
  annotations: Annotation[];
  /** Activity metrics at commit time */
  metrics: CommitMetrics;
  /** Figma frame ID for the changelog entry (optional, for navigation) */
  changelogFrameId?: string;
}

/**
 * Compressed commit record for archival storage
 * Retains essential metadata but drops full comment/annotation text
 */
export interface ArchivedCommit {
  id: string;
  version: string;
  title: string;
  description?: string;
  author: Author;
  timestamp: Date;
  /** Summary counts only, no full data */
  commentCount: number;
  annotationCount: number;
  totalNodes: number;
}

/**
 * Metadata for changelog storage management
 */
export interface ChangelogMeta {
  /** Schema version for migration support */
  version: number;
  /** Current versioning mode */
  mode: VersioningMode;
  /** ID of the most recent commit */
  lastCommitId?: string;
  /** Number of chunk keys in storage */
  chunkCount: number;
}

export interface FigmaVersion {
  id: string;
  timestamp: Date;
  description?: string;
}

export interface FigmaChangelogEntry {
  versionId: string;
  changes: string[];
  author?: string;
}

/**
 * Page-level change statistics for pre-commit display
 */
export interface PageChangeStats {
  /** Page ID */
  pageId: string;
  /** Page name */
  pageName: string;
  /** Number of nodes added */
  nodesAdded: number;
  /** Number of nodes removed */
  nodesRemoved: number;
  /** Number of nodes modified (property changes) */
  nodesModified: number;
  /** Total delta (added - removed) */
  totalDelta: number;
}

/**
 * Pre-commit statistics showing what changed since last commit
 */
export interface PreCommitStats {
  /** Comment count since last commit */
  newCommentsCount: number;
  /** Annotation count since last commit */
  newAnnotationsCount: number;
  /** Page-level change statistics */
  pageChanges: PageChangeStats[];
  /** Whether real-time tracking was active (if false, only comments/annotations available) */
  hasRealTimeTracking: boolean;
}
