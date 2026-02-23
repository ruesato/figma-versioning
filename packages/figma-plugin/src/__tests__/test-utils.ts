/**
 * Test utilities for mocking Figma APIs
 */

import type { Comment, Annotation, Commit } from '@figma-versioning/core';

/**
 * Mock client storage for testing
 */
export class MockClientStorage {
  private storage: Map<string, any> = new Map();

  async getAsync(key: string): Promise<any> {
    return this.storage.get(key) || null;
  }

  async setAsync(key: string, value: any): Promise<void> {
    this.storage.set(key, value);
  }

  async deleteAsync(key: string): Promise<void> {
    this.storage.delete(key);
  }

  clear(): void {
    this.storage.clear();
  }

  getAll(): Record<string, any> {
    return Object.fromEntries(this.storage.entries());
  }
}

/**
 * Mock scene node for testing
 */
export class MockSceneNode {
  id: string;
  name: string;
  type: string;
  children: MockSceneNode[] = [];
  annotations: Array<{ label: string; categoryId?: string }> = [];

  constructor(id: string, name: string, type: string = 'FRAME') {
    this.id = id;
    this.name = name;
    this.type = type;
  }

  addChild(child: MockSceneNode): void {
    this.children.push(child);
  }

  addAnnotation(label: string, categoryId?: string): void {
    this.annotations.push({ label, categoryId });
  }
}

/**
 * Mock Figma page
 */
export class MockPage {
  children: MockSceneNode[] = [];
  name: string;

  constructor(name: string = 'Page 1') {
    this.name = name;
  }

  addChild(child: MockSceneNode): void {
    this.children.push(child);
  }
}

/**
 * Mock Figma API
 */
export function createMockFigmaApi(options: {
  fileKey?: string;
  currentUser?: { name: string };
  currentPage?: MockPage;
} = {}): any {
  const {
    fileKey = 'test-file-key',
    currentUser = { name: 'Test User' },
    currentPage = new MockPage()
  } = options;

  return {
    fileKey,
    currentUser,
    currentPage,
    clientStorage: new MockClientStorage(),
    notify: () => {},
    closePlugin: () => {},
    saveVersionHistoryAsync: async () => {},
    annotations: {
      getAnnotationCategoryByIdAsync: async (id: string) => ({
        label: `Category ${id}`
      })
    },
    getNodeById: (_id: string) => null
  };
}

/**
 * Create mock comment data
 */
export function createMockComment(overrides: Partial<Comment> = {}): Comment {
  return {
    id: `comment-${Date.now()}-${Math.random()}`,
    author: { name: 'Test Author', email: 'test@example.com' },
    timestamp: new Date(),
    text: 'Test comment',
    nodeId: 'node-1',
    ...overrides
  };
}

/**
 * Create mock annotation data
 */
export function createMockAnnotation(overrides: Partial<Annotation> = {}): Annotation {
  return {
    label: 'Test annotation',
    nodeId: 'node-1',
    isPinned: false,
    ...overrides
  };
}

/**
 * Create mock commit data
 */
export function createMockCommit(overrides: Partial<Commit> = {}): Commit {
  return {
    id: `commit-${Date.now()}-${Math.random()}`,
    version: '1.0.0',
    title: 'Test commit',
    description: 'Test description',
    author: { name: 'Test Author' },
    timestamp: new Date(),
    comments: [],
    annotations: [],
    metrics: {
      totalNodes: 10,
      frames: 2,
      components: 1,
      instances: 3,
      textNodes: 4,
      feedbackCount: 0
    },
    ...overrides
  };
}

/**
 * Wait for async operations to complete
 */
export function waitForAsync(ms: number = 0): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
