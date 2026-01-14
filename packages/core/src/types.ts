/**
 * Core type definitions for Figma versioning
 */

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
