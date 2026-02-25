/**
 * Unit tests for trend visualization functions
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { Commit } from '@figma-versioning/core';
import { createTrendInsightsSection } from '../changelog/trend-visualization';
import { createMockCommit, createMockComment, createMockAnnotation } from './test-utils';

/**
 * Mock Figma API for testing
 */
function setupFigmaMocks() {
  // Mock basic Figma API methods needed for trend visualization
  const mockNodes: Record<string, any> = {};

  global.figma = {
    createFrame: () => {
      const id = `frame-${Math.random()}`;
      const frame: any = {
        id,
        type: 'FRAME',
        name: '',
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        children: [],
        layoutMode: 'NONE',
        primaryAxisSizingMode: 'AUTO',
        counterAxisSizingMode: 'AUTO',
        itemSpacing: 0,
        paddingTop: 0,
        paddingBottom: 0,
        paddingLeft: 0,
        paddingRight: 0,
        fills: [],
        strokes: [],
        strokeWeight: 0,
        cornerRadius: 0,
        locked: false,
        resize: (width: number, height: number) => {
          frame.width = width;
          frame.height = height;
        },
        appendChild: (child: any) => {
          frame.children.push(child);
        },
      };
      mockNodes[id] = frame;
      return frame;
    },
    createText: () => {
      const id = `text-${Math.random()}`;
      const text: any = {
        id,
        type: 'TEXT',
        characters: '',
        fontSize: 12,
        fontName: { family: 'Inter', style: 'Regular' },
        fills: [],
        locked: false,
        textAutoResize: 'NONE',
        resize: () => {},
      };
      mockNodes[id] = text;
      return text;
    },
    createRectangle: () => {
      const id = `rect-${Math.random()}`;
      const rect: any = {
        id,
        type: 'RECTANGLE',
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        fills: [],
        strokes: [],
        strokeWeight: 0,
        cornerRadius: 0,
        resize: (width: number, height: number) => {
          rect.width = width;
          rect.height = height;
        },
      };
      mockNodes[id] = rect;
      return rect;
    },
    createEllipse: () => {
      const id = `ellipse-${Math.random()}`;
      const ellipse: any = {
        id,
        type: 'ELLIPSE',
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        fills: [],
        resize: (width: number, height: number) => {
          ellipse.width = width;
          ellipse.height = height;
        },
      };
      mockNodes[id] = ellipse;
      return ellipse;
    },
    createVector: () => {
      const id = `vector-${Math.random()}`;
      const vector: any = {
        id,
        type: 'VECTOR',
        vectorNetwork: { vertices: [], segments: [], regions: [] },
        strokes: [],
        strokeWeight: 0,
        resize: () => {},
        setVectorNetworkAsync: async (network: any) => {
          vector.vectorNetwork = network;
        },
      };
      mockNodes[id] = vector;
      return vector;
    },
    loadFontAsync: async () => {},
    getNodeById: (id: string) => mockNodes[id],
    ui: {
      postMessage: () => {},
    },
  } as any;
}

describe('Trend Visualization', () => {
  beforeEach(() => {
    setupFigmaMocks();
  });

  describe('createTrendInsightsSection', () => {
    it('should create trend insights section with all visualizations', async () => {
      const commits: Commit[] = [
        createMockCommit({
          id: 'commit-1',
          version: '1.0.0',
          timestamp: new Date('2026-01-01'),
          metrics: {
            totalNodes: 10,
            frames: 2,
            components: 0,
            instances: 0,
            textNodes: 0,
            feedbackCount: 2,
          },
          comments: [
            createMockComment({ nodeId: 'node-1' }),
            createMockComment({ nodeId: 'node-1' }),
          ],
        }),
        createMockCommit({
          id: 'commit-2',
          version: '1.1.0',
          timestamp: new Date('2026-01-02'),
          metrics: {
            totalNodes: 20,
            frames: 3,
            components: 0,
            instances: 0,
            textNodes: 0,
            feedbackCount: 3,
          },
          annotations: [
            createMockAnnotation({ nodeId: 'node-2' }),
            createMockAnnotation({ nodeId: 'node-1' }),
          ],
        }),
        createMockCommit({
          id: 'commit-3',
          version: '1.2.0',
          timestamp: new Date('2026-01-03'),
          metrics: {
            totalNodes: 35,
            frames: 4,
            components: 0,
            instances: 0,
            textNodes: 0,
            feedbackCount: 5,
          },
          comments: [
            createMockComment({ nodeId: 'node-3' }),
          ],
        }),
      ];

      const section = await createTrendInsightsSection(commits);

      // Verify main container
      expect(section).toBeDefined();
      expect(section.name).toBe('Trend Insights');
      expect(section.layoutMode).toBe('VERTICAL');

      // Verify children (should have title + 4 visualization cards)
      expect(section.children.length).toBeGreaterThan(1);

      // Verify at least one child is a card
      const cards = section.children.filter(
        (child: any) => child.type === 'FRAME' && child.name !== 'Trend Insights'
      );
      expect(cards.length).toBeGreaterThan(0);
    });

    it('should handle empty commits array', async () => {
      const commits: Commit[] = [];

      const section = await createTrendInsightsSection(commits);

      expect(section).toBeDefined();
      expect(section.name).toBe('Trend Insights');
    });

    it('should use custom configuration', async () => {
      const commits: Commit[] = [
        createMockCommit({
          id: 'commit-1',
          timestamp: new Date('2026-01-01'),
          metrics: {
            totalNodes: 10,
            frames: 1,
            components: 0,
            instances: 0,
            textNodes: 0,
            feedbackCount: 0,
          },
        }),
      ];

      const section = await createTrendInsightsSection(commits, {
        recentCommits: 5,
        topNodesCount: 3,
        width: 600,
      });

      expect(section).toBeDefined();
      expect(section.width).toBe(600);
    });

    it('should handle commits with activity hotspots', async () => {
      const commits: Commit[] = [
        createMockCommit({
          id: 'commit-1',
          timestamp: new Date('2026-01-01'),
          metrics: {
            totalNodes: 10,
            frames: 1,
            components: 0,
            instances: 0,
            textNodes: 0,
            feedbackCount: 3,
          },
          comments: [
            createMockComment({ nodeId: 'node-hot-1' }),
            createMockComment({ nodeId: 'node-hot-1' }),
            createMockComment({ nodeId: 'node-hot-2' }),
          ],
          annotations: [
            createMockAnnotation({ nodeId: 'node-hot-1' }),
            createMockAnnotation({ nodeId: 'node-hot-3' }),
          ],
        }),
      ];

      const section = await createTrendInsightsSection(commits);

      expect(section).toBeDefined();
      // The section should contain visualization cards including active nodes
      expect(section.children.length).toBeGreaterThan(1);
    });

    it('should handle different growth trends', async () => {
      // Growing trend
      const growingCommits: Commit[] = [
        createMockCommit({
          id: 'c1',
          timestamp: new Date('2026-01-01'),
          metrics: { totalNodes: 10, frames: 1, components: 0, instances: 0, textNodes: 0, feedbackCount: 0 },
        }),
        createMockCommit({
          id: 'c2',
          timestamp: new Date('2026-01-02'),
          metrics: { totalNodes: 20, frames: 1, components: 0, instances: 0, textNodes: 0, feedbackCount: 0 },
        }),
      ];

      const growingSection = await createTrendInsightsSection(growingCommits);
      expect(growingSection).toBeDefined();

      // Shrinking trend
      const shrinkingCommits: Commit[] = [
        createMockCommit({
          id: 'c1',
          timestamp: new Date('2026-01-01'),
          metrics: { totalNodes: 20, frames: 1, components: 0, instances: 0, textNodes: 0, feedbackCount: 0 },
        }),
        createMockCommit({
          id: 'c2',
          timestamp: new Date('2026-01-02'),
          metrics: { totalNodes: 10, frames: 1, components: 0, instances: 0, textNodes: 0, feedbackCount: 0 },
        }),
      ];

      const shrinkingSection = await createTrendInsightsSection(shrinkingCommits);
      expect(shrinkingSection).toBeDefined();

      // Stable trend
      const stableCommits: Commit[] = [
        createMockCommit({
          id: 'c1',
          timestamp: new Date('2026-01-01'),
          metrics: { totalNodes: 20, frames: 1, components: 0, instances: 0, textNodes: 0, feedbackCount: 0 },
        }),
        createMockCommit({
          id: 'c2',
          timestamp: new Date('2026-01-02'),
          metrics: { totalNodes: 20, frames: 1, components: 0, instances: 0, textNodes: 0, feedbackCount: 0 },
        }),
      ];

      const stableSection = await createTrendInsightsSection(stableCommits);
      expect(stableSection).toBeDefined();
    });

    it('should handle different period classifications', async () => {
      // Mixed period (both growth and cleanup)
      const mixedCommits: Commit[] = [
        createMockCommit({
          id: 'c1',
          timestamp: new Date('2026-01-01'),
          metrics: { totalNodes: 10, frames: 1, components: 0, instances: 0, textNodes: 0, feedbackCount: 0 },
        }),
        createMockCommit({
          id: 'c2',
          timestamp: new Date('2026-01-02'),
          metrics: { totalNodes: 20, frames: 1, components: 0, instances: 0, textNodes: 0, feedbackCount: 0 },
        }),
        createMockCommit({
          id: 'c3',
          timestamp: new Date('2026-01-03'),
          metrics: { totalNodes: 15, frames: 1, components: 0, instances: 0, textNodes: 0, feedbackCount: 0 },
        }),
        createMockCommit({
          id: 'c4',
          timestamp: new Date('2026-01-04'),
          metrics: { totalNodes: 25, frames: 1, components: 0, instances: 0, textNodes: 0, feedbackCount: 0 },
        }),
      ];

      const section = await createTrendInsightsSection(mixedCommits);
      expect(section).toBeDefined();
      expect(section.children.length).toBeGreaterThan(1);
    });
  });
});
