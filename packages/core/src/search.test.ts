import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  extractKeywords,
  searchCommits,
  searchCommitsByDateRange,
  getRecentCommits
} from './search';
import type { Commit } from './types';

describe('extractKeywords', () => {
  it('should extract basic keywords', () => {
    const keywords = extractKeywords('button component design');
    expect(keywords).toEqual(['button', 'component', 'design']);
  });

  it('should filter out stop words', () => {
    const keywords = extractKeywords('the button is on the page');
    expect(keywords).toEqual(['button', 'page']);
  });

  it('should handle case insensitivity by default', () => {
    const keywords = extractKeywords('Button Component DESIGN');
    expect(keywords).toEqual(['button', 'component', 'design']);
  });

  it('should respect case sensitive option', () => {
    const keywords = extractKeywords('Button Component', { caseSensitive: true });
    expect(keywords).toEqual(['Button', 'Component']);
  });

  it('should filter by minimum keyword length', () => {
    const keywords = extractKeywords('a big red button', { minKeywordLength: 3 });
    expect(keywords).toEqual(['big', 'red', 'button']);
  });

  it('should use custom stop words', () => {
    const keywords = extractKeywords('remove this button', {
      stopWords: ['remove', 'this']
    });
    expect(keywords).toEqual(['button']);
  });

  it('should handle empty queries', () => {
    expect(extractKeywords('')).toEqual([]);
    expect(extractKeywords('   ')).toEqual([]);
  });

  it('should handle queries with only stop words', () => {
    const keywords = extractKeywords('the a an is');
    expect(keywords).toEqual([]);
  });

  it('should extract hyphenated words', () => {
    const keywords = extractKeywords('dark-mode toggle');
    expect(keywords).toEqual(['dark-mode', 'toggle']);
  });
});

describe('searchCommits', () => {
  const mockCommits: Commit[] = [
    {
      id: 'commit-1',
      title: 'Add button component',
      description: 'Created a new reusable button component',
      version: '1.0.0',
      timestamp: new Date('2024-01-15T10:00:00Z'),
      author: { id: 'user-1', name: 'Alice', avatarUrl: '' },
      comments: [],
      annotations: []
    },
    {
      id: 'commit-2',
      title: 'Update navbar styling',
      description: 'Improved the navigation bar design',
      version: '1.1.0',
      timestamp: new Date('2024-01-16T10:00:00Z'),
      author: { id: 'user-2', name: 'Bob', avatarUrl: '' },
      comments: [
        {
          id: 'comment-1',
          text: 'Looks great with the new color scheme',
          author: { id: 'user-3', name: 'Charlie', avatarUrl: '' },
          timestamp: new Date('2024-01-16T11:00:00Z')
        }
      ],
      annotations: []
    },
    {
      id: 'commit-3',
      title: 'Fix form validation',
      description: null,
      version: '1.1.1',
      timestamp: new Date('2024-01-17T10:00:00Z'),
      author: { id: 'user-1', name: 'Alice', avatarUrl: '' },
      comments: [],
      annotations: [
        {
          id: 'annotation-1',
          label: 'Input field validation',
          nodeId: 'node-1',
          position: { x: 0, y: 0 }
        }
      ]
    }
  ];

  it('should find commits by title keywords', () => {
    const results = searchCommits(mockCommits, 'button');
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('commit-1');
  });

  it('should find commits by description keywords', () => {
    const results = searchCommits(mockCommits, 'navigation');
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('commit-2');
  });

  it('should find commits by version with minKeywordLength=1', () => {
    const results = searchCommits(mockCommits, '1.1.1', { minKeywordLength: 1 });
    expect(results).toHaveLength(3); // All versions contain '1'
  });

  it('should find commits by unique version parts', () => {
    // Search for a longer version component
    const mockWithUniqueVersion: Commit[] = [
      ...mockCommits.slice(0, 2),
      {
        id: 'commit-4',
        title: 'Test commit',
        description: null,
        version: '10.5.2',
        timestamp: new Date('2024-01-18T10:00:00Z'),
        author: { id: 'user-1', name: 'Alice', avatarUrl: '' },
        comments: [],
        annotations: []
      }
    ];
    const results = searchCommits(mockWithUniqueVersion, '10', { minKeywordLength: 2 });
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('commit-4');
  });

  it('should find commits by comment text', () => {
    const results = searchCommits(mockCommits, 'color scheme');
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('commit-2');
  });

  it('should find commits by comment author name', () => {
    const results = searchCommits(mockCommits, 'Charlie');
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('commit-2');
  });

  it('should find commits by annotation label', () => {
    const results = searchCommits(mockCommits, 'validation');
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('commit-3');
  });

  it('should return all commits for empty query', () => {
    const results = searchCommits(mockCommits, '');
    expect(results).toHaveLength(3);
  });

  it('should return all commits for query with only stop words', () => {
    const results = searchCommits(mockCommits, 'the a an');
    expect(results).toHaveLength(3);
  });

  it('should return empty array when no matches found', () => {
    const results = searchCommits(mockCommits, 'nonexistent');
    expect(results).toHaveLength(0);
  });

  it('should be case insensitive by default', () => {
    const results = searchCommits(mockCommits, 'BUTTON');
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('commit-1');
  });

  it('should respect case sensitive option', () => {
    const results = searchCommits(mockCommits, 'BUTTON', { caseSensitive: true });
    expect(results).toHaveLength(0);
  });

  it('should find commits matching any keyword', () => {
    const results = searchCommits(mockCommits, 'button navbar');
    expect(results).toHaveLength(2);
    expect(results.map(c => c.id)).toContain('commit-1');
    expect(results.map(c => c.id)).toContain('commit-2');
  });
});

describe('searchCommitsByDateRange', () => {
  const mockCommits: Commit[] = [
    {
      id: 'commit-1',
      title: 'Commit 1',
      description: null,
      version: '1.0.0',
      timestamp: new Date('2024-01-10T10:00:00Z'),
      author: { id: 'user-1', name: 'Alice', avatarUrl: '' },
      comments: [],
      annotations: []
    },
    {
      id: 'commit-2',
      title: 'Commit 2',
      description: null,
      version: '1.1.0',
      timestamp: new Date('2024-01-15T10:00:00Z'),
      author: { id: 'user-1', name: 'Alice', avatarUrl: '' },
      comments: [],
      annotations: []
    },
    {
      id: 'commit-3',
      title: 'Commit 3',
      description: null,
      version: '1.2.0',
      timestamp: new Date('2024-01-20T10:00:00Z'),
      author: { id: 'user-1', name: 'Alice', avatarUrl: '' },
      comments: [],
      annotations: []
    }
  ];

  it('should find commits within date range', () => {
    const startDate = new Date('2024-01-12T00:00:00Z');
    const endDate = new Date('2024-01-18T00:00:00Z');
    const results = searchCommitsByDateRange(mockCommits, startDate, endDate);
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('commit-2');
  });

  it('should include commits on start date', () => {
    const startDate = new Date('2024-01-15T10:00:00Z');
    const endDate = new Date('2024-01-20T10:00:00Z');
    const results = searchCommitsByDateRange(mockCommits, startDate, endDate);
    expect(results).toHaveLength(2);
    expect(results.map(c => c.id)).toContain('commit-2');
    expect(results.map(c => c.id)).toContain('commit-3');
  });

  it('should include commits on end date', () => {
    const startDate = new Date('2024-01-10T10:00:00Z');
    const endDate = new Date('2024-01-15T10:00:00Z');
    const results = searchCommitsByDateRange(mockCommits, startDate, endDate);
    expect(results).toHaveLength(2);
    expect(results.map(c => c.id)).toContain('commit-1');
    expect(results.map(c => c.id)).toContain('commit-2');
  });

  it('should return empty array when no commits in range', () => {
    const startDate = new Date('2024-02-01T00:00:00Z');
    const endDate = new Date('2024-02-28T00:00:00Z');
    const results = searchCommitsByDateRange(mockCommits, startDate, endDate);
    expect(results).toHaveLength(0);
  });

  it('should return all commits when range includes all dates', () => {
    const startDate = new Date('2024-01-01T00:00:00Z');
    const endDate = new Date('2024-12-31T23:59:59Z');
    const results = searchCommitsByDateRange(mockCommits, startDate, endDate);
    expect(results).toHaveLength(3);
  });
});

describe('getRecentCommits', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-20T10:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const mockCommits: Commit[] = [
    {
      id: 'commit-1',
      title: 'Old commit',
      description: null,
      version: '1.0.0',
      timestamp: new Date('2024-01-01T10:00:00Z'),
      author: { id: 'user-1', name: 'Alice', avatarUrl: '' },
      comments: [],
      annotations: []
    },
    {
      id: 'commit-2',
      title: 'Recent commit',
      description: null,
      version: '1.1.0',
      timestamp: new Date('2024-01-18T10:00:00Z'),
      author: { id: 'user-1', name: 'Alice', avatarUrl: '' },
      comments: [],
      annotations: []
    },
    {
      id: 'commit-3',
      title: 'Today commit',
      description: null,
      version: '1.2.0',
      timestamp: new Date('2024-01-20T09:00:00Z'),
      author: { id: 'user-1', name: 'Alice', avatarUrl: '' },
      comments: [],
      annotations: []
    }
  ];

  it('should get commits from the last N days', () => {
    const results = getRecentCommits(mockCommits, 7);
    expect(results).toHaveLength(2);
    expect(results.map(c => c.id)).toContain('commit-2');
    expect(results.map(c => c.id)).toContain('commit-3');
  });

  it('should include commits from today', () => {
    const results = getRecentCommits(mockCommits, 1);
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('commit-3');
  });

  it('should return empty array when no recent commits', () => {
    const results = getRecentCommits(mockCommits, 0);
    expect(results).toHaveLength(0);
  });

  it('should return all commits when days is large', () => {
    const results = getRecentCommits(mockCommits, 365);
    expect(results).toHaveLength(3);
  });
});
