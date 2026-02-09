/**
 * Integration tests for commit creation flow
 * Tests the interaction between storage, filtering, and commit creation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { Commit, Comment, Annotation } from '@figma-versioning/core';
import {
  MockClientStorage,
  createMockComment,
  createMockAnnotation,
  createMockCommit
} from './test-utils';

// Constants from main.ts
const CHANGELOG_META_KEY = 'figma_versioning_changelog_meta';
const COMMIT_CHUNK_PREFIX = 'figma_versioning_commit_chunk_';
const CHUNK_SIZE = 10;

/**
 * Save a commit to storage (mimics saveCommit from main.ts)
 */
async function saveCommitToStorage(
  storage: MockClientStorage,
  commit: Commit,
  existingCommits: Commit[] = []
): Promise<void> {
  // Add new commit to the beginning
  const allCommits = [commit, ...existingCommits];

  // Split into chunks
  const chunks: Commit[][] = [];
  for (let i = 0; i < allCommits.length; i += CHUNK_SIZE) {
    chunks.push(allCommits.slice(i, i + CHUNK_SIZE));
  }

  // Save each chunk with JSON serialization
  for (let i = 0; i < chunks.length; i++) {
    const serialized = JSON.parse(JSON.stringify(chunks[i]));
    await storage.setAsync(`${COMMIT_CHUNK_PREFIX}${i}`, serialized);
  }

  // Update metadata
  const meta = {
    version: 1,
    mode: 'semantic' as const,
    chunkCount: chunks.length,
    lastCommitId: commit.id
  };
  await storage.setAsync(CHANGELOG_META_KEY, meta);
}

/**
 * Load all commits from storage (mimics loadCommits from main.ts)
 */
async function loadCommitsFromStorage(storage: MockClientStorage): Promise<Commit[]> {
  const meta = await storage.getAsync(CHANGELOG_META_KEY);
  if (!meta) return [];

  const commits: Commit[] = [];
  for (let i = 0; i < meta.chunkCount; i++) {
    const chunk = await storage.getAsync(`${COMMIT_CHUNK_PREFIX}${i}`);
    if (chunk && Array.isArray(chunk)) {
      // Restore Date objects
      const restored = chunk.map(c => ({
        ...c,
        timestamp: new Date(c.timestamp),
        comments: c.comments?.map((comment: any) => ({
          ...comment,
          timestamp: new Date(comment.timestamp)
        })) || []
      }));
      commits.push(...restored);
    }
  }

  return commits;
}

/**
 * Comment fingerprinting (from main.ts)
 */
function commentFingerprint(c: Comment): string {
  return c.id || `${c.author.name}|${c.text}|${c.nodeId || ''}`;
}

/**
 * Filter new comments (from main.ts)
 */
function filterNewComments(current: Comment[], allPrevious: Comment[]): Comment[] {
  if (allPrevious.length === 0) {
    return current;
  }

  const previousFingerprints = new Set(allPrevious.map(commentFingerprint));
  return current.filter(c => !previousFingerprints.has(commentFingerprint(c)));
}

/**
 * Annotation fingerprinting (from main.ts)
 */
function annotationFingerprint(a: Annotation): string {
  const propsStr = a.properties
    ? JSON.stringify(a.properties, Object.keys(a.properties).sort())
    : '';
  return `${a.label}|${a.nodeId}|${propsStr}`;
}

/**
 * Filter new annotations (from main.ts)
 */
function filterNewAnnotations(current: Annotation[], allPrevious: Annotation[]): Annotation[] {
  if (allPrevious.length === 0) {
    return current;
  }

  const previousFingerprints = new Set(allPrevious.map(annotationFingerprint));
  return current.filter(a => !previousFingerprints.has(annotationFingerprint(a)));
}

describe('Commit Storage Integration', () => {
  let storage: MockClientStorage;

  beforeEach(() => {
    storage = new MockClientStorage();
  });

  it('should save and load a single commit', async () => {
    const commit = createMockCommit({
      id: 'commit-1',
      version: '1.0.0',
      title: 'Initial commit'
    });

    await saveCommitToStorage(storage, commit);
    const loaded = await loadCommitsFromStorage(storage);

    expect(loaded).toHaveLength(1);
    expect(loaded[0].id).toBe('commit-1');
    expect(loaded[0].version).toBe('1.0.0');
    expect(loaded[0].title).toBe('Initial commit');
    expect(loaded[0].timestamp).toBeInstanceOf(Date);
  });

  it('should save and load multiple commits', async () => {
    const commits = [
      createMockCommit({ id: 'commit-1', version: '1.0.0' }),
      createMockCommit({ id: 'commit-2', version: '1.1.0' }),
      createMockCommit({ id: 'commit-3', version: '1.2.0' })
    ];

    // Save commits one by one (newest first)
    for (let i = commits.length - 1; i >= 0; i--) {
      const existingCommits = await loadCommitsFromStorage(storage);
      await saveCommitToStorage(storage, commits[i], existingCommits);
    }

    const loaded = await loadCommitsFromStorage(storage);

    expect(loaded).toHaveLength(3);
    expect(loaded[0].id).toBe('commit-1');
    expect(loaded[1].id).toBe('commit-2');
    expect(loaded[2].id).toBe('commit-3');
  });

  it('should handle chunking for many commits', async () => {
    const commits: Commit[] = [];
    for (let i = 0; i < 25; i++) {
      commits.push(createMockCommit({
        id: `commit-${i}`,
        version: `1.${i}.0`
      }));
    }

    // Save all commits (simulate multiple versions)
    for (let i = commits.length - 1; i >= 0; i--) {
      const existingCommits = await loadCommitsFromStorage(storage);
      await saveCommitToStorage(storage, commits[i], existingCommits);
    }

    const loaded = await loadCommitsFromStorage(storage);
    expect(loaded).toHaveLength(25);

    // Verify chunks were created (25 commits = 3 chunks: 10 + 10 + 5)
    const meta = await storage.getAsync(CHANGELOG_META_KEY);
    expect(meta.chunkCount).toBe(3);
  });

  it('should preserve Date objects through save/load cycle', async () => {
    const now = new Date('2024-01-15T10:30:00Z');
    const comment = createMockComment({
      timestamp: now,
      text: 'Test comment'
    });

    const commit = createMockCommit({
      timestamp: now,
      comments: [comment]
    });

    await saveCommitToStorage(storage, commit);
    const loaded = await loadCommitsFromStorage(storage);

    expect(loaded[0].timestamp).toBeInstanceOf(Date);
    expect(loaded[0].timestamp.toISOString()).toBe(now.toISOString());
    expect(loaded[0].comments[0].timestamp).toBeInstanceOf(Date);
    expect(loaded[0].comments[0].timestamp.toISOString()).toBe(now.toISOString());
  });
});

describe('Comment Filtering Integration', () => {
  it('should filter duplicate comments across multiple commits', () => {
    const baseComment = createMockComment({
      id: 'comment-1',
      text: 'Same comment',
      author: { name: 'Alice' }
    });

    const commit1Comments = [baseComment];
    const commit2Comments = [
      baseComment, // Duplicate
      createMockComment({ id: 'comment-2', text: 'New comment' })
    ];

    const filtered = filterNewComments(commit2Comments, commit1Comments);

    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe('comment-2');
  });

  it('should handle comments without IDs using content-based fingerprinting', () => {
    const comment1 = createMockComment({
      id: undefined,
      text: 'Same text',
      author: { name: 'Alice' },
      nodeId: 'node-1'
    }) as Comment;

    const comment2 = createMockComment({
      id: undefined,
      text: 'Same text',
      author: { name: 'Alice' },
      nodeId: 'node-1'
    }) as Comment;

    const filtered = filterNewComments([comment2], [comment1]);

    expect(filtered).toHaveLength(0); // Should be filtered as duplicate
  });

  it('should not filter comments with same text but different authors', () => {
    const comment1 = createMockComment({
      id: undefined,
      text: 'Same text',
      author: { name: 'Alice' },
      nodeId: 'node-1'
    }) as Comment;

    const comment2 = createMockComment({
      id: undefined,
      text: 'Same text',
      author: { name: 'Bob' },
      nodeId: 'node-1'
    }) as Comment;

    const filtered = filterNewComments([comment2], [comment1]);

    expect(filtered).toHaveLength(1); // Different author, should not be filtered
  });

  it('should filter comments across multiple historical commits', () => {
    const commit1Comments = [
      createMockComment({ id: 'comment-1', text: 'First' })
    ];

    const commit2Comments = [
      createMockComment({ id: 'comment-2', text: 'Second' })
    ];

    const commit3Comments = [
      createMockComment({ id: 'comment-1', text: 'First' }), // Duplicate from commit1
      createMockComment({ id: 'comment-2', text: 'Second' }), // Duplicate from commit2
      createMockComment({ id: 'comment-3', text: 'Third' }) // New
    ];

    const allPrevious = [...commit1Comments, ...commit2Comments];
    const filtered = filterNewComments(commit3Comments, allPrevious);

    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe('comment-3');
  });
});

describe('Annotation Filtering Integration', () => {
  it('should filter duplicate annotations across commits', () => {
    const annotation1 = createMockAnnotation({
      id: 'annotation-1',
      label: 'Same label',
      nodeId: 'node-1'
    });

    const commit1Annotations = [annotation1];
    const commit2Annotations = [
      annotation1, // Duplicate
      createMockAnnotation({ id: 'annotation-2', label: 'New label' })
    ];

    const filtered = filterNewAnnotations(commit2Annotations, commit1Annotations);

    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe('annotation-2');
  });

  it('should filter annotations with same label and nodeId but different properties', () => {
    const annotation1 = createMockAnnotation({
      label: 'Label',
      nodeId: 'node-1',
      properties: { color: 'red' }
    });

    const annotation2 = createMockAnnotation({
      label: 'Label',
      nodeId: 'node-1',
      properties: { color: 'blue' }
    });

    const filtered = filterNewAnnotations([annotation2], [annotation1]);

    // Should not be filtered because properties are different
    expect(filtered).toHaveLength(1);
  });

  it('should handle annotations with sorted properties for fingerprinting', () => {
    const annotation1 = createMockAnnotation({
      label: 'Label',
      nodeId: 'node-1',
      properties: { a: 1, b: 2, c: 3 }
    });

    const annotation2 = createMockAnnotation({
      label: 'Label',
      nodeId: 'node-1',
      properties: { c: 3, b: 2, a: 1 } // Same properties, different order
    });

    const filtered = filterNewAnnotations([annotation2], [annotation1]);

    // Should be filtered as duplicate (properties are sorted in fingerprint)
    expect(filtered).toHaveLength(0);
  });
});

describe('Full Commit Creation Flow', () => {
  let storage: MockClientStorage;

  beforeEach(() => {
    storage = new MockClientStorage();
  });

  it('should create multiple versions with incremental comments', async () => {
    // Version 1: Initial commit with 2 comments
    const v1Comments = [
      createMockComment({ id: 'comment-1', text: 'First comment' }),
      createMockComment({ id: 'comment-2', text: 'Second comment' })
    ];

    const commit1 = createMockCommit({
      id: 'commit-1',
      version: '1.0.0',
      comments: v1Comments
    });

    await saveCommitToStorage(storage, commit1);

    // Version 2: Add 1 new comment (2 old + 1 new = 3 total)
    const v2AllComments = [
      ...v1Comments,
      createMockComment({ id: 'comment-3', text: 'Third comment' })
    ];

    const existingCommits1 = await loadCommitsFromStorage(storage);
    const allPreviousComments1 = existingCommits1.flatMap(c => c.comments);
    const v2NewComments = filterNewComments(v2AllComments, allPreviousComments1);

    expect(v2NewComments).toHaveLength(1);
    expect(v2NewComments[0].id).toBe('comment-3');

    const commit2 = createMockCommit({
      id: 'commit-2',
      version: '1.1.0',
      comments: v2NewComments
    });

    await saveCommitToStorage(storage, commit2, existingCommits1);

    // Version 3: Add 2 new comments
    const v3AllComments = [
      ...v2AllComments,
      createMockComment({ id: 'comment-4', text: 'Fourth comment' }),
      createMockComment({ id: 'comment-5', text: 'Fifth comment' })
    ];

    const existingCommits2 = await loadCommitsFromStorage(storage);
    const allPreviousComments2 = existingCommits2.flatMap(c => c.comments);
    const v3NewComments = filterNewComments(v3AllComments, allPreviousComments2);

    expect(v3NewComments).toHaveLength(2);

    const commit3 = createMockCommit({
      id: 'commit-3',
      version: '1.2.0',
      comments: v3NewComments
    });

    await saveCommitToStorage(storage, commit3, existingCommits2);

    // Verify final state
    const finalCommits = await loadCommitsFromStorage(storage);
    expect(finalCommits).toHaveLength(3);
    expect(finalCommits[0].comments).toHaveLength(2); // commit-3
    expect(finalCommits[1].comments).toHaveLength(1); // commit-2
    expect(finalCommits[2].comments).toHaveLength(2); // commit-1
  });

  it('should handle scenario where new version has no new feedback', async () => {
    // Version 1: Initial commit with feedback
    const v1Comments = [
      createMockComment({ id: 'comment-1', text: 'First comment' })
    ];
    const v1Annotations = [
      createMockAnnotation({ id: 'annotation-1', label: 'First annotation' })
    ];

    const commit1 = createMockCommit({
      id: 'commit-1',
      version: '1.0.0',
      comments: v1Comments,
      annotations: v1Annotations
    });

    await saveCommitToStorage(storage, commit1);

    // Version 2: No new feedback (same comments/annotations)
    const existingCommits = await loadCommitsFromStorage(storage);
    const allPreviousComments = existingCommits.flatMap(c => c.comments);
    const allPreviousAnnotations = existingCommits.flatMap(c => c.annotations);

    const v2NewComments = filterNewComments(v1Comments, allPreviousComments);
    const v2NewAnnotations = filterNewAnnotations(v1Annotations, allPreviousAnnotations);

    expect(v2NewComments).toHaveLength(0);
    expect(v2NewAnnotations).toHaveLength(0);

    const commit2 = createMockCommit({
      id: 'commit-2',
      version: '1.1.0',
      comments: v2NewComments,
      annotations: v2NewAnnotations
    });

    await saveCommitToStorage(storage, commit2, existingCommits);

    // Verify
    const finalCommits = await loadCommitsFromStorage(storage);
    expect(finalCommits).toHaveLength(2);
    expect(finalCommits[0].comments).toHaveLength(0);
    expect(finalCommits[0].annotations).toHaveLength(0);
  });
});
