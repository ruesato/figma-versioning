/**
 * Histogram Module for Activity Visualization
 *
 * Calculates and renders activity histograms showing:
 * - Blue layer: feedbackCount (comments + annotations)
 * - Orange layer: |nodesDelta| (absolute node count change)
 */

import type { Commit } from '@figma-versioning/core';
import { getOrCreateChangelogPage } from './page-manager';

/**
 * Data structure for a single histogram bar
 */
export interface HistogramBar {
  /** Commit ID for reference */
  commitId: string;
  /** Version label for display */
  version: string;
  /** Commit title for tooltips */
  title: string;
  /** Timestamp for ordering */
  timestamp: Date;
  /** Feedback count (comments + annotations) - blue layer */
  feedbackCount: number;
  /** Absolute node count change from previous commit - orange layer */
  nodesDelta: number;
  /** Total height (sum of both layers) */
  totalHeight: number;
  /** Optional changelog frame ID for navigation */
  changelogFrameId?: string;
}

/**
 * Configuration for histogram rendering
 */
export interface HistogramConfig {
  /** Maximum number of bars to render (default: 100) */
  maxBars?: number;
  /** Bar width in pixels (default: 8) */
  barWidth?: number;
  /** Gap between bars in pixels (default: 4) */
  barGap?: number;
  /** Maximum bar height in pixels (default: 100) */
  maxHeight?: number;
  /** Whether to include legend (default: true) */
  showLegend?: boolean;
}

/**
 * Calculates histogram data from a list of commits
 *
 * Algorithm:
 * 1. Sort commits by timestamp (oldest to newest)
 * 2. For first commit: nodesDelta = 0 (no previous baseline)
 * 3. For subsequent commits: nodesDelta = current.totalNodes - previous.totalNodes
 * 4. Calculate totalHeight = feedbackCount + |nodesDelta|
 *
 * @param commits - Array of commits to process
 * @param config - Optional configuration for histogram
 * @returns Array of histogram bars, sorted newest first for display
 */
export function calculateHistogramData(
  commits: Commit[],
  config?: HistogramConfig
): HistogramBar[] {
  if (commits.length === 0) {
    return [];
  }

  const maxBars = config?.maxBars ?? 100;

  // Sort commits chronologically (oldest first) for delta calculation
  const sortedCommits = [...commits].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  // Take most recent commits up to maxBars
  const recentCommits = sortedCommits.slice(-maxBars);

  // Calculate histogram bars with deltas
  const bars: HistogramBar[] = recentCommits.map((commit, index) => {
    const feedbackCount = commit.metrics.feedbackCount;

    // Calculate nodes delta if not already present
    let nodesDelta = commit.metrics.nodesDelta ?? 0;
    if (nodesDelta === 0 && index > 0) {
      const previousCommit = recentCommits[index - 1];
      nodesDelta = commit.metrics.totalNodes - previousCommit.metrics.totalNodes;
    }

    // Use absolute value for visualization
    const absNodesDelta = Math.abs(nodesDelta);

    return {
      commitId: commit.id,
      version: commit.version,
      title: commit.title,
      timestamp: new Date(commit.timestamp),
      feedbackCount,
      nodesDelta: absNodesDelta,
      totalHeight: feedbackCount + absNodesDelta,
      changelogFrameId: commit.changelogFrameId,
    };
  });

  // Return in chronological order (oldest first) for display
  // Oldest commits will be on the left when rendered left-to-right
  return bars;
}

/**
 * Calculates bar height using square root scale
 *
 * Square root scaling compresses large values while keeping small values visible.
 * This makes it easier to compare commits with large disparities in activity.
 *
 * @param value - Value to scale
 * @param maxValue - Maximum value in dataset
 * @param maxHeight - Maximum height in pixels
 * @param minHeight - Minimum height in pixels (ensures visibility)
 * @returns Scaled height in pixels
 */
export function calculateBarHeight(
  value: number,
  maxValue: number,
  maxHeight: number,
  minHeight: number
): number {
  if (maxValue === 0 || value === 0) {
    return minHeight;
  }

  const sqrtValue = Math.sqrt(value);
  const sqrtMax = Math.sqrt(maxValue);
  const height = Math.round((sqrtValue / sqrtMax) * maxHeight);
  return Math.max(height, minHeight);
}

/**
 * Formats a histogram bar for display in a tooltip
 *
 * @param bar - Histogram bar to format
 * @returns Formatted string for tooltip
 */
export function formatBarTooltip(bar: HistogramBar): string {
  const lines = [
    `Version: ${bar.version}`,
    `Title: ${bar.title}`,
    `Feedback: ${bar.feedbackCount}`,
  ];

  if (bar.nodesDelta > 0) {
    lines.push(`Nodes Changed: ${bar.nodesDelta}`);
  }

  return lines.join('\n');
}

/**
 * Histogram colors for different layers
 */
export interface HistogramColors {
  /** Feedback count layer (blue) */
  feedback: RGB;
  /** Nodes delta layer (orange) */
  nodesDelta: RGB;
  /** Text color */
  text: RGB;
  /** Secondary text color */
  textSecondary: RGB;
}

/**
 * Get histogram colors based on theme
 *
 * @param themeColors - Theme colors from detectTheme
 * @returns Histogram-specific colors
 */
export function getHistogramColors(themeColors: import('./theme').ThemeColors): HistogramColors {
  return {
    feedback: themeColors.accent, // Blue from theme
    nodesDelta: { r: 1, g: 0.6, b: 0.2 }, // Orange
    text: themeColors.text,
    textSecondary: themeColors.textSecondary,
  };
}

/**
 * Load Inter font for histogram text rendering
 */
async function loadInterFont(): Promise<void> {
  await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
  await figma.loadFontAsync({ family: 'Inter', style: 'Medium' });
  await figma.loadFontAsync({ family: 'Inter', style: 'Bold' });
}

/**
 * Create a text node with specified content and styling
 */
function createText(
  content: string,
  fontSize: number,
  fontWeight: 'Regular' | 'Medium' | 'Bold',
  color: RGB
): TextNode {
  const text = figma.createText();
  text.fontName = { family: 'Inter', style: fontWeight };
  text.characters = content;
  text.fontSize = fontSize;
  text.fills = [{ type: 'SOLID', color }];
  return text;
}

/**
 * Create a single histogram bar
 *
 * Uses square root scaling and displays a single color based on dominant value:
 * - Blue if feedback count is dominant
 * - Orange if nodes delta is dominant
 *
 * @param bar - Histogram bar data
 * @param colors - Histogram colors
 * @param config - Histogram configuration
 * @param maxValue - Maximum totalHeight across all bars for scaling
 * @returns Frame node containing the bar
 */
function createHistogramBar(
  bar: HistogramBar,
  colors: HistogramColors,
  config: Required<HistogramConfig>,
  maxValue: number
): FrameNode {
  const barContainer = figma.createFrame();
  barContainer.name = `Bar: ${bar.version}`;
  barContainer.layoutMode = 'VERTICAL';
  barContainer.primaryAxisSizingMode = 'AUTO';
  barContainer.counterAxisSizingMode = 'FIXED';
  barContainer.resize(config.barWidth, config.maxHeight);
  barContainer.itemSpacing = 0;
  barContainer.fills = [];
  barContainer.counterAxisAlignItems = 'MIN';

  // Determine dominant color
  const isFeedbackDominant = bar.feedbackCount > bar.nodesDelta;
  const barColor = isFeedbackDominant ? colors.feedback : colors.nodesDelta;

  // Calculate height using square root scale
  const minHeight = 4;
  const barHeight = calculateBarHeight(bar.totalHeight, maxValue, config.maxHeight, minHeight);

  // Create bar rectangle
  const barRect = figma.createRectangle();
  barRect.name = 'Activity Bar';
  barRect.resize(config.barWidth, barHeight);
  barRect.fills = [{ type: 'SOLID', color: barColor }];
  barRect.cornerRadius = 2;
  barContainer.appendChild(barRect);

  // Store metadata for interactivity
  barContainer.setPluginData('commitId', bar.commitId);
  barContainer.setPluginData('version', bar.version);
  barContainer.setPluginData('title', bar.title);
  barContainer.setPluginData('feedbackCount', String(bar.feedbackCount));
  barContainer.setPluginData('nodesDelta', String(bar.nodesDelta));
  barContainer.setPluginData('isFeedbackDominant', String(isFeedbackDominant));
  if (bar.changelogFrameId) {
    barContainer.setPluginData('changelogFrameId', bar.changelogFrameId);
  }

  // Keep bars unlocked so they can be selected for navigation
  barContainer.locked = false;

  return barContainer;
}

/**
 * Create legend frame for histogram
 *
 * @param colors - Histogram colors
 * @returns Frame node containing the legend
 */
function createLegend(colors: HistogramColors): FrameNode {
  const legendFrame = figma.createFrame();
  legendFrame.name = 'Legend';
  legendFrame.layoutMode = 'HORIZONTAL';
  legendFrame.primaryAxisSizingMode = 'AUTO';
  legendFrame.counterAxisSizingMode = 'AUTO';
  legendFrame.itemSpacing = 16;
  legendFrame.fills = [];

  // Feedback legend item
  const feedbackItem = figma.createFrame();
  feedbackItem.name = 'Feedback Legend';
  feedbackItem.layoutMode = 'HORIZONTAL';
  feedbackItem.primaryAxisSizingMode = 'AUTO';
  feedbackItem.counterAxisSizingMode = 'AUTO';
  feedbackItem.itemSpacing = 6;
  feedbackItem.fills = [];

  const feedbackSwatch = figma.createRectangle();
  feedbackSwatch.resize(12, 12);
  feedbackSwatch.fills = [{ type: 'SOLID', color: colors.feedback }];
  feedbackItem.appendChild(feedbackSwatch);

  const feedbackLabel = createText('Feedback', 11, 'Regular', colors.text);
  feedbackItem.appendChild(feedbackLabel);

  legendFrame.appendChild(feedbackItem);

  // Nodes delta legend item
  const nodesDeltaItem = figma.createFrame();
  nodesDeltaItem.name = 'Nodes Delta Legend';
  nodesDeltaItem.layoutMode = 'HORIZONTAL';
  nodesDeltaItem.primaryAxisSizingMode = 'AUTO';
  nodesDeltaItem.counterAxisSizingMode = 'AUTO';
  nodesDeltaItem.itemSpacing = 6;
  nodesDeltaItem.fills = [];

  const nodesDeltaSwatch = figma.createRectangle();
  nodesDeltaSwatch.resize(12, 12);
  nodesDeltaSwatch.fills = [{ type: 'SOLID', color: colors.nodesDelta }];
  nodesDeltaItem.appendChild(nodesDeltaSwatch);

  const nodesDeltaLabel = createText('Nodes Changed', 11, 'Regular', colors.text);
  nodesDeltaItem.appendChild(nodesDeltaLabel);

  legendFrame.appendChild(nodesDeltaItem);

  return legendFrame;
}

/**
 * Create the complete histogram frame with bars, legend, and caption
 *
 * @param bars - Histogram bars to render
 * @param colors - Histogram colors
 * @param config - Histogram configuration
 * @returns Frame node containing the complete histogram
 */
function createHistogramFrame(
  bars: HistogramBar[],
  colors: HistogramColors,
  config: Required<HistogramConfig>
): FrameNode {
  const histogramFrame = figma.createFrame();
  histogramFrame.name = 'Activity Histogram';
  histogramFrame.layoutMode = 'VERTICAL';
  histogramFrame.primaryAxisSizingMode = 'AUTO';
  histogramFrame.counterAxisSizingMode = 'AUTO';
  histogramFrame.itemSpacing = 12;
  histogramFrame.fills = [];

  // Add title
  const title = createText('Recent activity', 14, 'Bold', colors.text);
  histogramFrame.appendChild(title);

  // Add legend if enabled
  if (config.showLegend) {
    const legend = createLegend(colors);
    histogramFrame.appendChild(legend);
  }

  // Create bars container
  const barsContainer = figma.createFrame();
  barsContainer.name = 'Bars';
  barsContainer.layoutMode = 'HORIZONTAL';
  barsContainer.primaryAxisSizingMode = 'AUTO';
  barsContainer.counterAxisSizingMode = 'AUTO';
  barsContainer.itemSpacing = config.barGap;
  barsContainer.fills = [];

  // Calculate maximum totalHeight for scaling
  const maxValue = Math.max(...bars.map((bar) => bar.totalHeight), 1);

  // Create bars (already in chronological order from calculateHistogramData)
  for (const bar of bars) {
    const barFrame = createHistogramBar(bar, colors, config, maxValue);
    barsContainer.appendChild(barFrame);
  }

  histogramFrame.appendChild(barsContainer);

  // Add caption
  const caption = createText(
    `Last ${bars.length} commits. Select a bar to view its changelog entry.`,
    12,
    'Regular',
    colors.textSecondary
  );
  histogramFrame.appendChild(caption);

  return histogramFrame;
}

/**
 * Render histogram on the Changelog page
 *
 * @param commits - Array of commits to visualize
 * @param config - Optional histogram configuration
 * @returns The created histogram frame
 */
export async function renderHistogramOnChangelogPage(
  commits: Commit[],
  config?: HistogramConfig
): Promise<FrameNode> {
  // Load fonts
  await loadInterFont();

  // Get theme colors
  const { detectTheme, getThemeColors } = await import('./theme');
  const theme = detectTheme();
  const themeColors = getThemeColors(theme);
  const histogramColors = getHistogramColors(themeColors);

  // Set default config
  const fullConfig: Required<HistogramConfig> = {
    maxBars: config?.maxBars ?? 100,
    barWidth: config?.barWidth ?? 8,
    barGap: config?.barGap ?? 4,
    maxHeight: config?.maxHeight ?? 100,
    showLegend: config?.showLegend ?? true,
  };

  // Calculate histogram data
  const bars = calculateHistogramData(commits, fullConfig);

  // Get or create changelog page first
  const { getOrCreateChangelogPage } = await import('./page-manager');
  const changelogPage = getOrCreateChangelogPage();

  // Remove existing histogram if present
  // Collect nodes to remove first to avoid modifying array during iteration
  const nodesToRemove: SceneNode[] = [];
  for (const node of changelogPage.children) {
    if (node.type === 'FRAME' && node.name === 'Activity Histogram') {
      nodesToRemove.push(node);
    }
  }
  // Remove collected nodes
  for (const node of nodesToRemove) {
    node.remove();
  }

  // Create histogram frame
  const histogramFrame = createHistogramFrame(bars, histogramColors, fullConfig);

  // Add to page first
  changelogPage.appendChild(histogramFrame);

  // Then position histogram above the changelog entries container
  histogramFrame.x = 100;
  histogramFrame.y = 100;

  return histogramFrame;
}

/**
 * Navigate to a changelog entry based on histogram bar selection
 *
 * This function checks if the current selection is a histogram bar,
 * retrieves the associated changelog frame ID, and navigates to it.
 *
 * @returns True if navigation occurred, false otherwise
 */
export function navigateFromHistogramBar(): boolean {
  const selection = figma.currentPage.selection;

  if (selection.length !== 1) {
    return false;
  }

  const selectedNode = selection[0];

  // Check if the selected node or its parent is a histogram bar
  let barNode: SceneNode | null = selectedNode;

  // Check up to 2 levels up (bar container or its children)
  for (let i = 0; i < 3 && barNode; i++) {
    if (barNode.type === 'FRAME') {
      const frameNode = barNode as FrameNode;
      const commitId = frameNode.getPluginData('commitId');
      const changelogFrameId = frameNode.getPluginData('changelogFrameId');

      if (commitId) {
        // If we have a changelog frame ID, navigate to it
        if (changelogFrameId) {
          const changelogFrame = figma.getNodeById(changelogFrameId);

          // Type guard: ensure it's a SceneNode
          if (changelogFrame && 'type' in changelogFrame && changelogFrame.type !== 'DOCUMENT') {
            // Ensure we're on the changelog page
            const changelogPage = getOrCreateChangelogPage();
            figma.currentPage = changelogPage;

            // Navigate to the changelog entry
            figma.viewport.scrollAndZoomIntoView([changelogFrame as SceneNode]);
            figma.currentPage.selection = [changelogFrame as SceneNode];

            return true;
          }
        }

        // If no changelog frame ID, just show a message
        figma.notify(`Selected commit: ${frameNode.getPluginData('version')} - ${frameNode.getPluginData('title')}`);
        return true;
      }
    }

    barNode = barNode.parent as SceneNode | null;
  }

  return false;
}

/**
 * Setup histogram interactivity by monitoring selection changes
 *
 * This function should be called when the plugin loads to enable
 * automatic navigation when users click on histogram bars.
 */
export function setupHistogramInteractivity(): void {
  figma.on('selectionchange', () => {
    navigateFromHistogramBar();
  });
}
