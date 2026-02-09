import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  parseSemanticVersion,
  incrementSemanticVersion,
  getNextSemanticVersion,
  isValidSemanticVersion,
  parseDateVersion,
  formatCurrentDate,
  getNextDateVersion,
  isValidDateVersion
} from './versioning';

describe('parseSemanticVersion', () => {
  it('should parse valid semantic versions', () => {
    expect(parseSemanticVersion('1.0.0')).toEqual({ major: 1, minor: 0, patch: 0 });
    expect(parseSemanticVersion('2.3.4')).toEqual({ major: 2, minor: 3, patch: 4 });
    expect(parseSemanticVersion('10.20.30')).toEqual({ major: 10, minor: 20, patch: 30 });
  });

  it('should return null for invalid formats', () => {
    expect(parseSemanticVersion('1.0')).toBeNull();
    expect(parseSemanticVersion('1.0.0.0')).toBeNull();
    expect(parseSemanticVersion('v1.0.0')).toBeNull();
    expect(parseSemanticVersion('1.0.x')).toBeNull();
    expect(parseSemanticVersion('invalid')).toBeNull();
    expect(parseSemanticVersion('')).toBeNull();
  });
});

describe('incrementSemanticVersion', () => {
  it('should increment major version', () => {
    expect(incrementSemanticVersion('1.2.3', 'major')).toBe('2.0.0');
    expect(incrementSemanticVersion('0.1.0', 'major')).toBe('1.0.0');
    expect(incrementSemanticVersion('10.5.2', 'major')).toBe('11.0.0');
  });

  it('should increment minor version', () => {
    expect(incrementSemanticVersion('1.2.3', 'minor')).toBe('1.3.0');
    expect(incrementSemanticVersion('0.0.1', 'minor')).toBe('0.1.0');
    expect(incrementSemanticVersion('5.9.2', 'minor')).toBe('5.10.0');
  });

  it('should increment patch version', () => {
    expect(incrementSemanticVersion('1.2.3', 'patch')).toBe('1.2.4');
    expect(incrementSemanticVersion('0.0.0', 'patch')).toBe('0.0.1');
    expect(incrementSemanticVersion('2.1.9', 'patch')).toBe('2.1.10');
  });

  it('should return 1.0.0 for invalid current version', () => {
    expect(incrementSemanticVersion('invalid', 'major')).toBe('1.0.0');
    expect(incrementSemanticVersion('1.0', 'minor')).toBe('1.0.0');
    expect(incrementSemanticVersion('', 'patch')).toBe('1.0.0');
  });

  it('should return current version for invalid increment type', () => {
    expect(incrementSemanticVersion('1.2.3', 'invalid' as any)).toBe('1.2.3');
  });
});

describe('getNextSemanticVersion', () => {
  it('should return 1.0.0 when no current version exists', () => {
    expect(getNextSemanticVersion(null)).toBe('1.0.0');
    expect(getNextSemanticVersion(undefined)).toBe('1.0.0');
    expect(getNextSemanticVersion('')).toBe('1.0.0');
  });

  it('should default to patch increment', () => {
    expect(getNextSemanticVersion('1.2.3')).toBe('1.2.4');
  });

  it('should increment based on provided type', () => {
    expect(getNextSemanticVersion('1.2.3', 'major')).toBe('2.0.0');
    expect(getNextSemanticVersion('1.2.3', 'minor')).toBe('1.3.0');
    expect(getNextSemanticVersion('1.2.3', 'patch')).toBe('1.2.4');
  });
});

describe('isValidSemanticVersion', () => {
  it('should validate correct semantic versions', () => {
    expect(isValidSemanticVersion('1.0.0')).toBe(true);
    expect(isValidSemanticVersion('0.0.1')).toBe(true);
    expect(isValidSemanticVersion('10.20.30')).toBe(true);
  });

  it('should reject invalid semantic versions', () => {
    expect(isValidSemanticVersion('1.0')).toBe(false);
    expect(isValidSemanticVersion('v1.0.0')).toBe(false);
    expect(isValidSemanticVersion('1.0.0-alpha')).toBe(false);
    expect(isValidSemanticVersion('invalid')).toBe(false);
    expect(isValidSemanticVersion('')).toBe(false);
  });
});

describe('parseDateVersion', () => {
  it('should parse date-only versions', () => {
    expect(parseDateVersion('2024-01-15')).toEqual({ date: '2024-01-15', sequence: 0 });
    expect(parseDateVersion('2023-12-31')).toEqual({ date: '2023-12-31', sequence: 0 });
  });

  it('should parse date versions with sequence', () => {
    expect(parseDateVersion('2024-01-15.1')).toEqual({ date: '2024-01-15', sequence: 1 });
    expect(parseDateVersion('2024-01-15.5')).toEqual({ date: '2024-01-15', sequence: 5 });
    expect(parseDateVersion('2024-01-15.10')).toEqual({ date: '2024-01-15', sequence: 10 });
  });

  it('should return null for invalid formats', () => {
    expect(parseDateVersion('2024-1-15')).toBeNull();
    expect(parseDateVersion('24-01-15')).toBeNull();
    expect(parseDateVersion('2024-01-15.x')).toBeNull();
    expect(parseDateVersion('invalid')).toBeNull();
    expect(parseDateVersion('')).toBeNull();
  });
});

describe('formatCurrentDate', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should format current date as YYYY-MM-DD', () => {
    vi.setSystemTime(new Date('2024-01-15T10:30:00Z'));
    expect(formatCurrentDate()).toBe('2024-01-15');
  });

  it('should pad single digit months and days', () => {
    vi.setSystemTime(new Date('2024-03-05T10:30:00Z'));
    expect(formatCurrentDate()).toBe('2024-03-05');
  });

  it('should handle different dates', () => {
    vi.setSystemTime(new Date('2023-12-31T23:59:59Z'));
    expect(formatCurrentDate()).toBe('2023-12-31');
  });
});

describe('getNextDateVersion', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-15T10:30:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return today\'s date when no current version exists', () => {
    expect(getNextDateVersion(null)).toBe('2024-01-15');
    expect(getNextDateVersion(undefined)).toBe('2024-01-15');
  });

  it('should return today\'s date when current version is invalid', () => {
    expect(getNextDateVersion('invalid')).toBe('2024-01-15');
    expect(getNextDateVersion('2024-1-15')).toBe('2024-01-15');
  });

  it('should increment sequence when current version is from today', () => {
    expect(getNextDateVersion('2024-01-15')).toBe('2024-01-15.1');
    expect(getNextDateVersion('2024-01-15.1')).toBe('2024-01-15.2');
    expect(getNextDateVersion('2024-01-15.5')).toBe('2024-01-15.6');
  });

  it('should start fresh when current version is from a different day', () => {
    expect(getNextDateVersion('2024-01-14')).toBe('2024-01-15');
    expect(getNextDateVersion('2024-01-14.5')).toBe('2024-01-15');
    expect(getNextDateVersion('2023-12-31')).toBe('2024-01-15');
  });
});

describe('isValidDateVersion', () => {
  it('should validate correct date versions', () => {
    expect(isValidDateVersion('2024-01-15')).toBe(true);
    expect(isValidDateVersion('2024-01-15.1')).toBe(true);
    expect(isValidDateVersion('2024-12-31.10')).toBe(true);
  });

  it('should reject invalid date versions', () => {
    expect(isValidDateVersion('2024-1-15')).toBe(false);
    expect(isValidDateVersion('24-01-15')).toBe(false);
    expect(isValidDateVersion('2024-01-15.x')).toBe(false);
    expect(isValidDateVersion('invalid')).toBe(false);
    expect(isValidDateVersion('')).toBe(false);
  });
});
