/**
 * Trend Visualization Module
 *
 * Creates visual charts and graphs for trend analysis data:
 * - Line chart: File size (node count) over time
 * - Bar chart: Most active nodes (last 10 commits)
 * - List view: High-churn nodes (top 5)
 * - Timeline: Period classification (expansion/cleanup/stable)
 */

import type { Commit } from '@figma-versioning/core';
import {
  computeChangelogAnalytics,
  type ChangelogAnalytics,
  type FileGrowthAnalysis,
  type PeriodClassification,
  type ActivityHotspot,
} from './analytics';
import { getThemeColors } from './theme';
import { getOrCreateChangelogPage } from './page-manager';

/**
 * Configuration for trend visualization
 */
export interface TrendVisualizationConfig {
  /** Number of recent commits to analyze (default: 10) */
  recentCommits?: number;
  /** Number of top active nodes to display (default: 5) */
  topNodesCount?: number;
  /** Width of visualization frame (default: 800) */
  width?: number;
}

/**
 * Colors for trend visualizations
 */
interface TrendColors {
  /** Primary accent color (blue) */
  primary: RGB;
  /** Secondary accent color (orange) */
  secondary: RGB;
  /** Success/growth color (green) */
  success: RGB;
  /** Warning/stable color (yellow) */
  warning: RGB;
  /** Error/decline color (red) */
  error: RGB;
  /** Text colors */
  text: RGB;
  textSecondary: RGB;
  textMuted: RGB;
  /** Background colors */
  background: RGB;
  cardBackground: RGB;
  border: RGB;
}

/**
 * Get colors for trend visualizations based on theme
 */
function getTrendColors(theme: 'light' | 'dark' | 'figjam'): TrendColors {
  const themeColors = getThemeColors(theme);

  return {
    primary: { r: 0.031, g: 0.522, b: 0.996 }, // #0885fe (blue)
    secondary: { r: 1, g: 0.408, b: 0 }, // #ff6800 (orange)
    success: { r: 0.133, g: 0.745, b: 0.333 }, // #22be55 (green)
    warning: { r: 1, g: 0.733, b: 0 }, // #ffbb00 (yellow)
    error: { r: 0.953, g: 0.267, b: 0.267 }, // #f34444 (red)
    text: themeColors.text,
    textSecondary: themeColors.textSecondary,
    textMuted: themeColors.textMuted,
    background: themeColors.background,
    cardBackground: themeColors.headerBackground,
    border: themeColors.border,
  };
}

/**
 * Load Inter font for text rendering
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
 * Create a card frame for wrapping visualization sections
 */
function createCard(title: string, colors: TrendColors, width: number): FrameNode {
  const card = figma.createFrame();
  card.name = title;
  card.layoutMode = 'VERTICAL';
  card.primaryAxisSizingMode = 'AUTO';
  card.counterAxisSizingMode = 'FIXED';
  card.resize(width, 100);
  card.itemSpacing = 12;
  card.paddingTop = 16;
  card.paddingBottom = 16;
  card.paddingLeft = 16;
  card.paddingRight = 16;
  card.fills = [{ type: 'SOLID', color: colors.cardBackground }];
  card.cornerRadius = 8;
  card.strokes = [{ type: 'SOLID', color: colors.border }];
  card.strokeWeight = 1;

  // Add title
  const titleText = createText(title, 14, 'Bold', colors.text);
  card.appendChild(titleText);

  return card;
}

/**
 * Create line chart for file growth over time
 *
 * Displays a simple line chart showing node count changes across commits.
 * Uses connected points with labels for first, middle, and last commits.
 */
function createFileGrowthChart(
  commits: Commit[],
  analysis: FileGrowthAnalysis,
  colors: TrendColors,
  width: number
): FrameNode {
  const card = createCard('File Growth Over Time', colors, width);

  // Handle empty commits
  if (commits.length === 0) {
    const emptyText = createText('No data available', 12, 'Regular', colors.textMuted);
    card.appendChild(emptyText);
    return card;
  }

  // Sort commits chronologically
  const sorted = [...commits].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  // Create chart area
  const chartHeight = 120;
  const chartWidth = width - 32;
  const chartPadding = 20;

  const chartFrame = figma.createFrame();
  chartFrame.name = 'Chart';
  chartFrame.layoutMode = 'VERTICAL';
  chartFrame.primaryAxisSizingMode = 'AUTO';
  chartFrame.counterAxisSizingMode = 'FIXED';
  chartFrame.resize(chartWidth, chartHeight);
  chartFrame.fills = [];

  // Find min and max values for scaling
  const nodeValues = sorted.map((c) => c.metrics.totalNodes);
  const minNodes = Math.min(...nodeValues);
  const maxNodes = Math.max(...nodeValues);
  const range = maxNodes - minNodes || 1;

  // Calculate trend color
  let trendColor: RGB;
  if (analysis.trend === 'growing') {
    trendColor = colors.success;
  } else if (analysis.trend === 'shrinking') {
    trendColor = colors.error;
  } else {
    trendColor = colors.warning;
  }

  // Create line path using vector network
  const line = figma.createVector();
  line.name = 'Growth Line';

  // Build vector path
  const points: VectorVertex[] = [];
  const segments: VectorSegment[] = [];

  sorted.forEach((commit, index) => {
    const x = chartPadding + (index / (sorted.length - 1)) * (chartWidth - chartPadding * 2);
    const normalizedValue = (commit.metrics.totalNodes - minNodes) / range;
    const y = chartHeight - chartPadding - normalizedValue * (chartHeight - chartPadding * 2);

    points.push({
      x,
      y,
      strokeCap: 'NONE',
      strokeJoin: 'MITER',
      cornerRadius: 0,
      handleMirroring: 'NONE',
    });

    if (index > 0) {
      segments.push({
        start: index - 1,
        end: index,
        tangentStart: { x: 0, y: 0 },
        tangentEnd: { x: 0, y: 0 },
      });
    }
  });

  line.vectorNetwork = {
    vertices: points,
    segments,
    regions: [],
  };

  line.strokes = [{ type: 'SOLID', color: trendColor }];
  line.strokeWeight = 2;
  line.resize(chartWidth, chartHeight);

  chartFrame.appendChild(line);

  // Add point markers at key positions (first, middle, last)
  const keyIndices = [
    0,
    Math.floor(sorted.length / 2),
    sorted.length - 1,
  ].filter((i, idx, arr) => arr.indexOf(i) === idx); // Remove duplicates

  keyIndices.forEach((index) => {
    const commit = sorted[index];
    const x = chartPadding + (index / (sorted.length - 1)) * (chartWidth - chartPadding * 2);
    const normalizedValue = (commit.metrics.totalNodes - minNodes) / range;
    const y = chartHeight - chartPadding - normalizedValue * (chartHeight - chartPadding * 2);

    // Create point marker
    const point = figma.createEllipse();
    point.name = `Point ${index}`;
    point.resize(6, 6);
    point.x = x - 3;
    point.y = y - 3;
    point.fills = [{ type: 'SOLID', color: trendColor }];

    chartFrame.appendChild(point);
  });

  card.appendChild(chartFrame);

  // Add summary stats
  const statsFrame = figma.createFrame();
  statsFrame.name = 'Stats';
  statsFrame.layoutMode = 'HORIZONTAL';
  statsFrame.primaryAxisSizingMode = 'AUTO';
  statsFrame.counterAxisSizingMode = 'AUTO';
  statsFrame.itemSpacing = 24;
  statsFrame.fills = [];

  const stats = [
    { label: 'Trend', value: analysis.trend, color: trendColor },
    { label: 'Current', value: `${analysis.currentNodes} nodes`, color: colors.text },
    { label: 'Change', value: `${analysis.totalGrowth >= 0 ? '+' : ''}${analysis.totalGrowth}`, color: colors.text },
    { label: 'Avg Rate', value: `${analysis.averageGrowthRate >= 0 ? '+' : ''}${analysis.averageGrowthRate}/commit`, color: colors.textSecondary },
  ];

  stats.forEach((stat) => {
    const statFrame = figma.createFrame();
    statFrame.name = stat.label;
    statFrame.layoutMode = 'VERTICAL';
    statFrame.primaryAxisSizingMode = 'AUTO';
    statFrame.counterAxisSizingMode = 'AUTO';
    statFrame.itemSpacing = 2;
    statFrame.fills = [];

    const label = createText(stat.label, 11, 'Regular', colors.textMuted);
    const value = createText(stat.value, 13, 'Bold', stat.color);

    statFrame.appendChild(label);
    statFrame.appendChild(value);
    statsFrame.appendChild(statFrame);
  });

  card.appendChild(statsFrame);

  return card;
}

/**
 * Create bar chart for most active nodes
 *
 * Shows horizontal bars for top N nodes by activity count.
 */
function createMostActiveNodesChart(
  hotspots: ActivityHotspot[],
  topCount: number,
  colors: TrendColors,
  width: number
): FrameNode {
  const card = createCard(`Top ${topCount} Most Active Nodes`, colors, width);

  if (hotspots.length === 0) {
    const emptyText = createText('No activity data available', 12, 'Regular', colors.textMuted);
    card.appendChild(emptyText);
    return card;
  }

  // Take top N hotspots
  const topHotspots = hotspots.slice(0, topCount);
  const maxActivity = Math.max(...topHotspots.map((h) => h.activityCount));

  // Create bars
  const barsFrame = figma.createFrame();
  barsFrame.name = 'Bars';
  barsFrame.layoutMode = 'VERTICAL';
  barsFrame.primaryAxisSizingMode = 'AUTO';
  barsFrame.counterAxisSizingMode = 'FIXED';
  barsFrame.resize(width - 32, 100);
  barsFrame.itemSpacing = 8;
  barsFrame.fills = [];

  topHotspots.forEach((hotspot, index) => {
    const barFrame = figma.createFrame();
    barFrame.name = `Bar ${index + 1}`;
    barFrame.layoutMode = 'VERTICAL';
    barFrame.primaryAxisSizingMode = 'AUTO';
    barFrame.counterAxisSizingMode = 'FIXED';
    barFrame.resize(width - 32, 40);
    barFrame.itemSpacing = 4;
    barFrame.fills = [];

    // Node ID label
    const nodeLabel = createText(
      `Node: ${hotspot.nodeId.substring(0, 12)}...`,
      11,
      'Medium',
      colors.text
    );
    barFrame.appendChild(nodeLabel);

    // Bar container with background
    const barContainer = figma.createFrame();
    barContainer.name = 'Bar Container';
    barContainer.layoutMode = 'HORIZONTAL';
    barContainer.primaryAxisSizingMode = 'FIXED';
    barContainer.counterAxisSizingMode = 'FIXED';
    barContainer.resize(width - 32, 16);
    barContainer.fills = [{ type: 'SOLID', color: colors.border }];
    barContainer.cornerRadius = 4;

    // Active bar
    const barWidth = (hotspot.activityCount / maxActivity) * (width - 32);
    const bar = figma.createFrame();
    bar.name = 'Active Bar';
    bar.resize(barWidth, 16);
    bar.fills = [{ type: 'SOLID', color: colors.primary }];
    bar.cornerRadius = 4;

    barContainer.appendChild(bar);
    barFrame.appendChild(barContainer);

    // Stats label
    const statsLabel = createText(
      `${hotspot.activityCount} activities • ${hotspot.commitCount} commits`,
      10,
      'Regular',
      colors.textMuted
    );
    barFrame.appendChild(statsLabel);

    barsFrame.appendChild(barFrame);
  });

  card.appendChild(barsFrame);

  return card;
}

/**
 * Create list view for high-churn nodes
 *
 * Shows a simple list of top nodes with their activity counts.
 */
function createHighChurnList(
  hotspots: ActivityHotspot[],
  topCount: number,
  colors: TrendColors,
  width: number
): FrameNode {
  const card = createCard(`Top ${topCount} High-Churn Nodes`, colors, width);

  if (hotspots.length === 0) {
    const emptyText = createText('No activity data available', 12, 'Regular', colors.textMuted);
    card.appendChild(emptyText);
    return card;
  }

  // Take top N hotspots
  const topHotspots = hotspots.slice(0, topCount);

  // Create list
  const listFrame = figma.createFrame();
  listFrame.name = 'List';
  listFrame.layoutMode = 'VERTICAL';
  listFrame.primaryAxisSizingMode = 'AUTO';
  listFrame.counterAxisSizingMode = 'FIXED';
  listFrame.resize(width - 32, 100);
  listFrame.itemSpacing = 8;
  listFrame.fills = [];

  topHotspots.forEach((hotspot, index) => {
    const itemFrame = figma.createFrame();
    itemFrame.name = `Item ${index + 1}`;
    itemFrame.layoutMode = 'HORIZONTAL';
    itemFrame.primaryAxisSizingMode = 'AUTO';
    itemFrame.counterAxisSizingMode = 'AUTO';
    itemFrame.itemSpacing = 12;
    itemFrame.fills = [];
    itemFrame.counterAxisAlignItems = 'CENTER';

    // Rank badge
    const badge = figma.createFrame();
    badge.name = 'Rank';
    badge.layoutMode = 'HORIZONTAL';
    badge.primaryAxisSizingMode = 'AUTO';
    badge.counterAxisSizingMode = 'AUTO';
    badge.paddingTop = 4;
    badge.paddingBottom = 4;
    badge.paddingLeft = 8;
    badge.paddingRight = 8;
    badge.fills = [{ type: 'SOLID', color: colors.primary }];
    badge.cornerRadius = 4;

    const rankText = createText(`#${index + 1}`, 11, 'Bold', colors.background);
    badge.appendChild(rankText);
    itemFrame.appendChild(badge);

    // Node info
    const infoFrame = figma.createFrame();
    infoFrame.name = 'Info';
    infoFrame.layoutMode = 'VERTICAL';
    infoFrame.primaryAxisSizingMode = 'AUTO';
    infoFrame.counterAxisSizingMode = 'AUTO';
    infoFrame.itemSpacing = 2;
    infoFrame.fills = [];

    const nodeText = createText(hotspot.nodeId, 12, 'Medium', colors.text);
    const statsText = createText(
      `${hotspot.activityCount} activities • ${hotspot.commitCount} commits`,
      10,
      'Regular',
      colors.textMuted
    );

    infoFrame.appendChild(nodeText);
    infoFrame.appendChild(statsText);
    itemFrame.appendChild(infoFrame);

    listFrame.appendChild(itemFrame);
  });

  card.appendChild(listFrame);

  return card;
}

/**
 * Create timeline for period classification
 *
 * Shows a horizontal timeline with color-coded segments for different period types.
 */
function createPeriodTimeline(
  classification: PeriodClassification,
  colors: TrendColors,
  width: number
): FrameNode {
  const card = createCard('Project Activity Period', colors, width);

  // Timeline container
  const timelineFrame = figma.createFrame();
  timelineFrame.name = 'Timeline';
  timelineFrame.layoutMode = 'VERTICAL';
  timelineFrame.primaryAxisSizingMode = 'AUTO';
  timelineFrame.counterAxisSizingMode = 'FIXED';
  timelineFrame.resize(width - 32, 80);
  timelineFrame.itemSpacing = 12;
  timelineFrame.fills = [];

  // Main period indicator
  const periodColors = {
    expansion: colors.success,
    cleanup: colors.error,
    stable: colors.warning,
    mixed: colors.textSecondary,
  };

  const periodColor = periodColors[classification.type];
  const periodLabels = {
    expansion: 'Expansion Phase',
    cleanup: 'Cleanup Phase',
    stable: 'Stable Phase',
    mixed: 'Mixed Activity',
  };

  const mainPeriod = figma.createFrame();
  mainPeriod.name = 'Main Period';
  mainPeriod.layoutMode = 'HORIZONTAL';
  mainPeriod.primaryAxisSizingMode = 'AUTO';
  mainPeriod.counterAxisSizingMode = 'AUTO';
  mainPeriod.itemSpacing = 12;
  mainPeriod.fills = [];
  mainPeriod.counterAxisAlignItems = 'CENTER';

  // Period badge
  const periodBadge = figma.createFrame();
  periodBadge.name = 'Period Badge';
  periodBadge.layoutMode = 'HORIZONTAL';
  periodBadge.primaryAxisSizingMode = 'AUTO';
  periodBadge.counterAxisSizingMode = 'AUTO';
  periodBadge.paddingTop = 6;
  periodBadge.paddingBottom = 6;
  periodBadge.paddingLeft = 12;
  periodBadge.paddingRight = 12;
  periodBadge.fills = [{ type: 'SOLID', color: periodColor, opacity: 0.2 }];
  periodBadge.cornerRadius = 6;

  const periodText = createText(periodLabels[classification.type], 14, 'Bold', periodColor);
  periodBadge.appendChild(periodText);
  mainPeriod.appendChild(periodBadge);

  // Total commits
  const commitsText = createText(
    `${classification.totalCommits} commits analyzed`,
    12,
    'Regular',
    colors.textMuted
  );
  mainPeriod.appendChild(commitsText);

  timelineFrame.appendChild(mainPeriod);

  // Breakdown bars
  const breakdownFrame = figma.createFrame();
  breakdownFrame.name = 'Breakdown';
  breakdownFrame.layoutMode = 'HORIZONTAL';
  breakdownFrame.primaryAxisSizingMode = 'FIXED';
  breakdownFrame.counterAxisSizingMode = 'FIXED';
  breakdownFrame.resize(width - 32, 20);
  breakdownFrame.itemSpacing = 0;
  breakdownFrame.fills = [];

  const segments = [
    { rate: classification.expansionRate, color: colors.success, label: 'Expansion' },
    { rate: classification.cleanupRate, color: colors.error, label: 'Cleanup' },
    { rate: classification.stableRate, color: colors.warning, label: 'Stable' },
  ];

  segments.forEach((segment) => {
    if (segment.rate > 0) {
      const segmentWidth = ((segment.rate / 100) * (width - 32));
      const segmentBar = figma.createFrame();
      segmentBar.name = segment.label;
      segmentBar.resize(segmentWidth, 20);
      segmentBar.fills = [{ type: 'SOLID', color: segment.color }];
      breakdownFrame.appendChild(segmentBar);
    }
  });

  timelineFrame.appendChild(breakdownFrame);

  // Legend
  const legendFrame = figma.createFrame();
  legendFrame.name = 'Legend';
  legendFrame.layoutMode = 'HORIZONTAL';
  legendFrame.primaryAxisSizingMode = 'AUTO';
  legendFrame.counterAxisSizingMode = 'AUTO';
  legendFrame.itemSpacing = 16;
  legendFrame.fills = [];

  segments.forEach((segment) => {
    const legendItem = figma.createFrame();
    legendItem.name = `${segment.label} Legend`;
    legendItem.layoutMode = 'HORIZONTAL';
    legendItem.primaryAxisSizingMode = 'AUTO';
    legendItem.counterAxisSizingMode = 'AUTO';
    legendItem.itemSpacing = 6;
    legendItem.fills = [];
    legendItem.counterAxisAlignItems = 'CENTER';

    const swatch = figma.createRectangle();
    swatch.resize(12, 12);
    swatch.fills = [{ type: 'SOLID', color: segment.color }];
    swatch.cornerRadius = 2;
    legendItem.appendChild(swatch);

    const label = createText(`${segment.label} ${segment.rate}%`, 11, 'Regular', colors.text);
    legendItem.appendChild(label);

    legendFrame.appendChild(legendItem);
  });

  timelineFrame.appendChild(legendFrame);
  card.appendChild(timelineFrame);

  return card;
}

/**
 * Create complete trend insights visualization
 *
 * Combines all visualization components into a single expandable section.
 */
export async function createTrendInsightsSection(
  commits: Commit[],
  config?: TrendVisualizationConfig
): Promise<FrameNode> {
  // Load fonts
  await loadInterFont();

  // Set defaults
  const fullConfig: Required<TrendVisualizationConfig> = {
    recentCommits: config?.recentCommits ?? 10,
    topNodesCount: config?.topNodesCount ?? 5,
    width: config?.width ?? 800,
  };

  // Get theme colors
  const { detectTheme } = await import('./theme');
  const theme = detectTheme();
  const colors = getTrendColors(theme);

  // Compute analytics
  const analytics = computeChangelogAnalytics(commits, {
    recentCommitsForNodes: fullConfig.recentCommits,
  });

  // Create main container
  const container = figma.createFrame();
  container.name = 'Trend Insights';
  container.layoutMode = 'VERTICAL';
  container.primaryAxisSizingMode = 'AUTO';
  container.counterAxisSizingMode = 'FIXED';
  container.resize(fullConfig.width, 100);
  container.itemSpacing = 16;
  container.paddingTop = 20;
  container.paddingBottom = 20;
  container.paddingLeft = 20;
  container.paddingRight = 20;
  container.fills = [{ type: 'SOLID', color: colors.background, opacity: 0.5 }];
  container.cornerRadius = 8;

  // Add title
  const title = createText('📊 Trend Insights & Analytics', 18, 'Bold', colors.text);
  container.appendChild(title);

  // Add visualizations
  const fileGrowthChart = createFileGrowthChart(commits, analytics.fileGrowth, colors, fullConfig.width - 40);
  container.appendChild(fileGrowthChart);

  const periodTimeline = createPeriodTimeline(analytics.periodClassification, colors, fullConfig.width - 40);
  container.appendChild(periodTimeline);

  const mostActiveChart = createMostActiveNodesChart(
    analytics.activeNodes.hotspots,
    fullConfig.topNodesCount,
    colors,
    fullConfig.width - 40
  );
  container.appendChild(mostActiveChart);

  const highChurnList = createHighChurnList(
    analytics.activeNodes.hotspots,
    fullConfig.topNodesCount,
    colors,
    fullConfig.width - 40
  );
  container.appendChild(highChurnList);

  return container;
}

/**
 * Render trend insights on the changelog page
 *
 * Adds the trend insights section to the changelog page at a fixed position.
 */
export async function renderTrendInsightsOnChangelogPage(
  commits: Commit[],
  config?: TrendVisualizationConfig
): Promise<FrameNode> {
  // Get or create changelog page
  const changelogPage = getOrCreateChangelogPage();

  // Remove existing trend insights if present
  const nodesToRemove: SceneNode[] = [];
  for (const node of changelogPage.children) {
    if (node.type === 'FRAME' && node.name === 'Trend Insights') {
      nodesToRemove.push(node);
    }
  }
  for (const node of nodesToRemove) {
    node.remove();
  }

  // Create trend insights section
  const trendInsights = await createTrendInsightsSection(commits, config);

  // Add to page
  changelogPage.appendChild(trendInsights);

  // Position below histogram (or at top if histogram doesn't exist)
  let yPosition = 100;

  // Look for histogram to position below it
  for (const node of changelogPage.children) {
    if (node.type === 'FRAME' && node.name === 'Activity Histogram') {
      yPosition = (node as FrameNode).y + (node as FrameNode).height + 40;
      break;
    }
  }

  trendInsights.x = 100;
  trendInsights.y = yPosition;

  return trendInsights;
}
