/**
 * Histogram Module for Activity Visualization
 *
 * Calculates and renders activity histograms showing:
 * - Blue layer: feedbackCount (comments + annotations)
 * - Orange layer: |nodesDelta| (absolute node count change)
 */

import type { Commit } from '@figma-versioning/core';

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
  /** Maximum number of bars to render (default: 50) */
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

  const maxBars = config?.maxBars ?? 50;

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

  // Return in reverse chronological order (newest first) for display
  return bars.reverse();
}

/**
 * Calculates the scale factor for histogram bars based on maximum value
 *
 * @param bars - Histogram bars to scale
 * @param maxHeight - Maximum height in pixels
 * @returns Scale factor to multiply totalHeight by
 */
export function calculateScale(bars: HistogramBar[], maxHeight: number): number {
  if (bars.length === 0) {
    return 1;
  }

  const maxValue = Math.max(...bars.map((bar) => bar.totalHeight));

  if (maxValue === 0) {
    return 1;
  }

  return maxHeight / maxValue;
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
 * Create a single histogram bar with stacked layers
 *
 * @param bar - Histogram bar data
 * @param colors - Histogram colors
 * @param config - Histogram configuration
 * @param scale - Scale factor for bar heights
 * @returns Frame node containing the stacked bar
 */
function createHistogramBar(
  bar: HistogramBar,
  colors: HistogramColors,
  config: Required<HistogramConfig>,
  scale: number
): FrameNode {
  const barContainer = figma.createFrame();
  barContainer.name = `Bar: ${bar.version}`;
  barContainer.layoutMode = 'VERTICAL';
  barContainer.primaryAxisSizingMode = 'AUTO';
  barContainer.counterAxisSizingMode = 'FIXED';
  barContainer.resize(config.barWidth, config.maxHeight);
  barContainer.itemSpacing = 0;
  barContainer.fills = [];

  // Calculate scaled heights
  const feedbackHeight = Math.round(bar.feedbackCount * scale);
  const nodesDeltaHeight = Math.round(bar.nodesDelta * scale);

  // Create nodes delta layer (orange) - appears on top visually
  if (nodesDeltaHeight > 0) {
    const nodesDeltaRect = figma.createRectangle();
    nodesDeltaRect.name = 'Nodes Delta';
    nodesDeltaRect.resize(config.barWidth, nodesDeltaHeight);
    nodesDeltaRect.fills = [{ type: 'SOLID', color: colors.nodesDelta }];
    barContainer.appendChild(nodesDeltaRect);
  }

  // Create feedback layer (blue) - appears below nodes delta
  if (feedbackHeight > 0) {
    const feedbackRect = figma.createRectangle();
    feedbackRect.name = 'Feedback';
    feedbackRect.resize(config.barWidth, feedbackHeight);
    feedbackRect.fills = [{ type: 'SOLID', color: colors.feedback }];
    barContainer.appendChild(feedbackRect);
  }

  // Store metadata for interactivity
  barContainer.setPluginData('commitId', bar.commitId);
  barContainer.setPluginData('version', bar.version);
  barContainer.setPluginData('title', bar.title);
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
 * Create the complete histogram frame with bars and legend
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
  const title = createText('Activity History', 14, 'Bold', colors.text);
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

  // Calculate scale
  const scale = calculateScale(bars, config.maxHeight);

  // Create bars (already in newest-first order from calculateHistogramData)
  for (const bar of bars) {
    const barFrame = createHistogramBar(bar, colors, config, scale);
    barsContainer.appendChild(barFrame);
  }

  histogramFrame.appendChild(barsContainer);

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
    maxBars: config?.maxBars ?? 50,
    barWidth: config?.barWidth ?? 8,
    barGap: config?.barGap ?? 4,
    maxHeight: config?.maxHeight ?? 100,
    showLegend: config?.showLegend ?? true,
  };

  // Calculate histogram data
  const bars = calculateHistogramData(commits, fullConfig);

  // Create histogram frame
  const histogramFrame = createHistogramFrame(bars, histogramColors, fullConfig);

  // Position histogram above the changelog entries container
  histogramFrame.x = 100;
  histogramFrame.y = 100;

  // Get or create changelog page
  const { getOrCreateChangelogPage } = await import('./page-manager');
  const changelogPage = getOrCreateChangelogPage();

  // Remove existing histogram if present
  for (const node of changelogPage.children) {
    if (node.type === 'FRAME' && node.name === 'Activity Histogram') {
      node.remove();
    }
  }

  // Add to page
  changelogPage.appendChild(histogramFrame);

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
  let isHistogramBar = false;

  // Check up to 2 levels up (bar container or its children)
  for (let i = 0; i < 3 && barNode; i++) {
    if (barNode.type === 'FRAME') {
      const frameNode = barNode as FrameNode;
      const commitId = frameNode.getPluginData('commitId');
      const changelogFrameId = frameNode.getPluginData('changelogFrameId');

      if (commitId) {
        isHistogramBar = true;

        // If we have a changelog frame ID, navigate to it
        if (changelogFrameId) {
          const changelogFrame = figma.getNodeById(changelogFrameId);

          if (changelogFrame) {
            // Ensure we're on the changelog page
            const { getOrCreateChangelogPage } = require('./page-manager');
            const changelogPage = getOrCreateChangelogPage();
            figma.currentPage = changelogPage;

            // Navigate to the changelog entry
            figma.viewport.scrollAndZoomIntoView([changelogFrame]);
            figma.currentPage.selection = [changelogFrame];

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
