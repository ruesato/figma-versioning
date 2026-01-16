/**
 * Search utilities for changelog queries
 */

import type { Commit } from './types';

/**
 * Options for keyword search
 */
export interface SearchOptions {
  /** Whether to perform case-sensitive search */
  caseSensitive?: boolean;
  /** Minimum keyword length to consider */
  minKeywordLength?: number;
  /** Common words to ignore */
  stopWords?: string[];
}

/**
 * Default stop words to filter out from search queries
 */
const DEFAULT_STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
  'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'can', 'what', 'when', 'where', 'how', 'why'
]);

/**
 * Extract keywords from a natural language query
 */
export function extractKeywords(
  query: string,
  options: SearchOptions = {}
): string[] {
  const {
    caseSensitive = false,
    minKeywordLength = 2,
    stopWords = Array.from(DEFAULT_STOP_WORDS)
  } = options;

  const stopWordsSet = new Set(stopWords.map(w => w.toLowerCase()));

  // Normalize query
  let normalized = query.trim();
  if (!caseSensitive) {
    normalized = normalized.toLowerCase();
  }

  // Extract words (alphanumeric sequences)
  const words = normalized.match(/\b[\w-]+\b/g) || [];

  // Filter by length and stop words
  return words.filter(word => {
    const lower = word.toLowerCase();
    return word.length >= minKeywordLength && !stopWordsSet.has(lower);
  });
}

/**
 * Check if text contains any of the keywords
 */
function textContainsKeywords(
  text: string,
  keywords: string[],
  caseSensitive: boolean
): boolean {
  const normalized = caseSensitive ? text : text.toLowerCase();
  return keywords.some(keyword => normalized.includes(keyword));
}

/**
 * Search commits for keyword matches
 * Returns commits that contain at least one keyword in their title, description, comments, or annotations
 */
export function searchCommits(
  commits: Commit[],
  query: string,
  options: SearchOptions = {}
): Commit[] {
  const { caseSensitive = false } = options;
  const keywords = extractKeywords(query, options);

  if (keywords.length === 0) {
    // No valid keywords, return all commits
    return commits;
  }

  return commits.filter(commit => {
    // Search in commit title
    if (textContainsKeywords(commit.title, keywords, caseSensitive)) {
      return true;
    }

    // Search in commit description
    if (commit.description && textContainsKeywords(commit.description, keywords, caseSensitive)) {
      return true;
    }

    // Search in commit version
    if (textContainsKeywords(commit.version, keywords, caseSensitive)) {
      return true;
    }

    // Search in comments
    const hasCommentMatch = commit.comments.some(comment =>
      textContainsKeywords(comment.text, keywords, caseSensitive) ||
      textContainsKeywords(comment.author.name, keywords, caseSensitive)
    );
    if (hasCommentMatch) {
      return true;
    }

    // Search in annotations
    const hasAnnotationMatch = commit.annotations.some(annotation =>
      textContainsKeywords(annotation.label, keywords, caseSensitive)
    );
    if (hasAnnotationMatch) {
      return true;
    }

    return false;
  });
}

/**
 * Search commits within a date range
 */
export function searchCommitsByDateRange(
  commits: Commit[],
  startDate: Date,
  endDate: Date
): Commit[] {
  return commits.filter(commit => {
    const commitDate = new Date(commit.timestamp);
    return commitDate >= startDate && commitDate <= endDate;
  });
}

/**
 * Get commits from the last N days
 */
export function getRecentCommits(
  commits: Commit[],
  days: number
): Commit[] {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return searchCommitsByDateRange(commits, startDate, endDate);
}
