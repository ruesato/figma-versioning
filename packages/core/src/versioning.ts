import type { VersionIncrement } from './types';

/**
 * Parse a semantic version string into its components
 */
export function parseSemanticVersion(version: string): { major: number; minor: number; patch: number } | null {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match || !match[1] || !match[2] || !match[3]) {
    return null;
  }
  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10)
  };
}

/**
 * Increment a semantic version based on the increment type
 */
export function incrementSemanticVersion(currentVersion: string, increment: VersionIncrement): string {
  const parsed = parseSemanticVersion(currentVersion);

  // If parsing fails, start from 1.0.0
  if (!parsed) {
    return '1.0.0';
  }

  switch (increment) {
    case 'major':
      return `${parsed.major + 1}.0.0`;
    case 'minor':
      return `${parsed.major}.${parsed.minor + 1}.0`;
    case 'patch':
      return `${parsed.major}.${parsed.minor}.${parsed.patch + 1}`;
    default:
      return currentVersion;
  }
}

/**
 * Get the next semantic version given the current version and increment type
 * If no current version exists, returns 1.0.0
 */
export function getNextSemanticVersion(
  currentVersion: string | null | undefined,
  increment: VersionIncrement = 'patch'
): string {
  if (!currentVersion) {
    return '1.0.0';
  }
  return incrementSemanticVersion(currentVersion, increment);
}

/**
 * Validate that a string is a valid semantic version
 */
export function isValidSemanticVersion(version: string): boolean {
  return parseSemanticVersion(version) !== null;
}

/**
 * Parse a date-based version into its components
 * Supports formats: YYYY-MM-DD or YYYY-MM-DD.N
 */
export function parseDateVersion(version: string): { date: string; sequence: number } | null {
  const match = version.match(/^(\d{4}-\d{2}-\d{2})(?:\.(\d+))?$/);
  if (!match || !match[1]) {
    return null;
  }
  return {
    date: match[1],
    sequence: match[2] ? parseInt(match[2], 10) : 0
  };
}

/**
 * Format current date as YYYY-MM-DD
 */
export function formatCurrentDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get the next date-based version
 * If no versions exist for today, returns YYYY-MM-DD
 * If versions exist for today, returns YYYY-MM-DD.N where N is the next sequence number
 */
export function getNextDateVersion(currentVersion: string | null | undefined): string {
  const today = formatCurrentDate();

  if (!currentVersion) {
    return today;
  }

  const parsed = parseDateVersion(currentVersion);
  if (!parsed) {
    return today;
  }

  // If the current version is from today, increment the sequence
  if (parsed.date === today) {
    const nextSequence = parsed.sequence + 1;
    return `${today}.${nextSequence}`;
  }

  // If the current version is from a different day, start fresh
  return today;
}

/**
 * Validate that a string is a valid date-based version
 */
export function isValidDateVersion(version: string): boolean {
  return parseDateVersion(version) !== null;
}
