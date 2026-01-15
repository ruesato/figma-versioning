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
