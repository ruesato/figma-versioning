/**
 * Trend Visualization Module
 *
 * Creates visual charts and graphs for trend analysis data:
 * - Line chart: File size (layer count) over time
 * - List view: High-churn layers (top 5)
 * - Timeline: Period classification (expansion/cleanup/stable)
 */

import type { Commit } from '@figma-versioning/core';
import {
  computeChangelogAnalytics,
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
  /** Number of top active layers to display (default: 5) */
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
  headerBackground: RGB;
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
    headerBackground: themeColors.headerBackground,
    border: themeColors.border,
  };
}

/**
 * Get layer name from node ID, prefixed with the page name
 * Returns "[pageName] / [layerName]" if found, or a fallback string if deleted/not found
 */
function getLayerName(nodeId: string): string {
  try {
    const node = figma.getNodeById(nodeId);
    if (node && 'name' in node) {
      // Walk up the parent chain to find the containing page
      let current: BaseNode | null = node;
      let pageName: string | null = null;
      while (current && current.parent) {
        current = current.parent;
        if (current.type === 'PAGE') {
          pageName = current.name;
          break;
        }
      }

      return pageName ? `${pageName} / ${node.name}` : node.name;
    }
    return `Layer ${nodeId.substring(0, 8)}... (deleted)`;
  } catch (error) {
    return `Layer ${nodeId.substring(0, 8)}... (deleted)`;
  }
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
 * Create a flat section frame with 24px padding and no background
 * Optionally adds a bottom border.
 */
function createSection(name: string, width: number, spacing: number, borderColor?: RGB): FrameNode {
  const section = figma.createFrame();
  section.name = name;
  section.layoutMode = 'VERTICAL';
  section.primaryAxisSizingMode = 'AUTO';
  section.counterAxisSizingMode = 'FIXED';
  section.resize(width, 100);
  section.itemSpacing = spacing;
  section.paddingTop = 24;
  section.paddingBottom = 24;
  section.paddingLeft = 24;
  section.paddingRight = 24;
  section.fills = [];
  if (borderColor) {
    section.strokes = [{ type: 'SOLID', color: borderColor }];
    section.strokeTopWeight = 0;
    section.strokeRightWeight = 0;
    section.strokeBottomWeight = 1;
    section.strokeLeftWeight = 0;
  }
  return section;
}

/**
 * Format a timestamp as a short date string (e.g. "Jan 1, 2024")
 */
function formatDate(timestamp: Date): string {
  return timestamp.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Create line chart for file growth over time
 *
 * Flat section with a line chart, date range labels, and summary stats.
 */
function createFileGrowthChart(
  commits: Commit[],
  analysis: FileGrowthAnalysis,
  colors: TrendColors,
  width: number
): FrameNode {
  const section = createSection('File Growth Over Time', width, 24, colors.border);

  const sectionTitle = createText('FILE GROWTH OVER TIME', 16, 'Bold', colors.text);
  section.appendChild(sectionTitle);

  if (commits.length === 0) {
    const emptyText = createText('No data available', 12, 'Regular', colors.textMuted);
    section.appendChild(emptyText);
    return section;
  }

  const sorted = [...commits].sort(
    (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
  );

  const contentWidth = width - 48;
  const chartHeight = 120;
  const chartPadding = 20;

  // Trend color
  let trendColor: RGB;
  if (analysis.trend === 'growing') {
    trendColor = colors.success;
  } else if (analysis.trend === 'shrinking') {
    trendColor = colors.error;
  } else {
    trendColor = colors.warning;
  }

  // Chart + date range wrapper
  const chartWrapper = figma.createFrame();
  chartWrapper.name = 'chart';
  chartWrapper.layoutMode = 'VERTICAL';
  chartWrapper.primaryAxisSizingMode = 'AUTO';
  chartWrapper.counterAxisSizingMode = 'FIXED';
  chartWrapper.resize(contentWidth, 100);
  chartWrapper.itemSpacing = 12;
  chartWrapper.fills = [];

  // Chart area
  const chartFrame = figma.createFrame();
  chartFrame.name = 'Chart';
  chartFrame.layoutMode = 'VERTICAL';
  chartFrame.primaryAxisSizingMode = 'AUTO';
  chartFrame.counterAxisSizingMode = 'FIXED';
  chartFrame.resize(contentWidth, chartHeight);
  chartFrame.fills = [];

  const nodeValues = sorted.map((c) => c.metrics.totalNodes);
  const minNodes = Math.min(...nodeValues);
  const maxNodes = Math.max(...nodeValues);
  const range = maxNodes - minNodes || 1;

  const line = figma.createVector();
  line.name = 'Growth Line';

  const points: VectorVertex[] = [];
  const segments: VectorSegment[] = [];

  sorted.forEach((commit, index) => {
    const x =
      chartPadding + (index / (sorted.length - 1)) * (contentWidth - chartPadding * 2);
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

  line.vectorNetwork = { vertices: points, segments, regions: [] };
  line.strokes = [{ type: 'SOLID', color: trendColor }];
  line.strokeWeight = 2;
  line.resize(contentWidth, chartHeight);

  chartFrame.appendChild(line);

  const keyIndices = [0, Math.floor(sorted.length / 2), sorted.length - 1].filter(
    (i, idx, arr) => arr.indexOf(i) === idx
  );

  keyIndices.forEach((index) => {
    const commit = sorted[index];
    const x =
      chartPadding + (index / (sorted.length - 1)) * (contentWidth - chartPadding * 2);
    const normalizedValue = (commit.metrics.totalNodes - minNodes) / range;
    const y = chartHeight - chartPadding - normalizedValue * (chartHeight - chartPadding * 2);

    const point = figma.createEllipse();
    point.name = `Point ${index}`;
    point.resize(6, 6);
    point.x = x - 3;
    point.y = y - 3;
    point.fills = [{ type: 'SOLID', color: trendColor }];
    chartFrame.appendChild(point);
  });

  chartWrapper.appendChild(chartFrame);

  // Date range row
  const dateRow = figma.createFrame();
  dateRow.name = 'dateRange';
  dateRow.layoutMode = 'HORIZONTAL';
  dateRow.primaryAxisSizingMode = 'FIXED';
  dateRow.counterAxisSizingMode = 'AUTO';
  dateRow.resize(contentWidth, 20);
  dateRow.primaryAxisAlignItems = 'SPACE_BETWEEN';
  dateRow.fills = [];

  const startText = createText(formatDate(sorted[0].timestamp), 13, 'Medium', colors.textMuted);
  const endText = createText(
    formatDate(sorted[sorted.length - 1].timestamp),
    13,
    'Medium',
    colors.textMuted
  );
  dateRow.appendChild(startText);
  dateRow.appendChild(endText);

  chartWrapper.appendChild(dateRow);
  section.appendChild(chartWrapper);

  // Stats row
  const statsFrame = figma.createFrame();
  statsFrame.name = 'Stats';
  statsFrame.layoutMode = 'HORIZONTAL';
  statsFrame.primaryAxisSizingMode = 'AUTO';
  statsFrame.counterAxisSizingMode = 'AUTO';
  statsFrame.itemSpacing = 48;
  statsFrame.fills = [];

  const stats = [
    { label: 'TREND', value: analysis.trend, color: trendColor },
    { label: 'CURRENT', value: `${analysis.currentNodes} layers`, color: colors.text },
    {
      label: 'CHANGE',
      value: `${analysis.totalGrowth >= 0 ? '+' : ''}${analysis.totalGrowth} layers`,
      color: colors.text,
    },
    {
      label: 'AVG RATE',
      value: `${analysis.averageGrowthRate >= 0 ? '+' : ''}${analysis.averageGrowthRate}/commit`,
      color: colors.textSecondary,
    },
  ];

  stats.forEach((stat) => {
    const statFrame = figma.createFrame();
    statFrame.name = stat.label;
    statFrame.layoutMode = 'VERTICAL';
    statFrame.primaryAxisSizingMode = 'AUTO';
    statFrame.counterAxisSizingMode = 'AUTO';
    statFrame.itemSpacing = 6;
    statFrame.fills = [];

    const label = createText(stat.label, 13, 'Regular', colors.textMuted);
    const value = createText(stat.value, 16, 'Bold', stat.color);
    statFrame.appendChild(label);
    statFrame.appendChild(value);
    statsFrame.appendChild(statFrame);
  });

  section.appendChild(statsFrame);

  return section;
}

/**
 * Create timeline for period classification
 *
 * Flat section with period badge, breakdown bar, and legend.
 */
function createPeriodTimeline(
  classification: PeriodClassification,
  colors: TrendColors,
  width: number
): FrameNode {
  const section = createSection('Project Activity Period', width, 12);

  const sectionTitle = createText('PROJECT ACTIVITY PERIOD', 16, 'Bold', colors.text);
  section.appendChild(sectionTitle);

  const contentWidth = width - 48;

  const periodColors = {
    expansion: colors.success,
    cleanup: colors.error,
    stable: colors.warning,
    mixed: colors.textSecondary,
  };

  const periodColor = periodColors[classification.type];
  const periodLabels: Record<string, string> = {
    expansion: 'EXPANSION PHASE',
    cleanup: 'CLEANUP PHASE',
    stable: 'STABLE PHASE',
    mixed: 'MIXED ACTIVITY',
  };

  const timelineFrame = figma.createFrame();
  timelineFrame.name = 'Timeline';
  timelineFrame.layoutMode = 'VERTICAL';
  timelineFrame.primaryAxisSizingMode = 'AUTO';
  timelineFrame.counterAxisSizingMode = 'FIXED';
  timelineFrame.resize(contentWidth, 80);
  timelineFrame.itemSpacing = 12;
  timelineFrame.fills = [];

  // Period badge + commit count
  const mainPeriod = figma.createFrame();
  mainPeriod.name = 'Main Period';
  mainPeriod.layoutMode = 'HORIZONTAL';
  mainPeriod.primaryAxisSizingMode = 'AUTO';
  mainPeriod.counterAxisSizingMode = 'AUTO';
  mainPeriod.itemSpacing = 12;
  mainPeriod.fills = [];
  mainPeriod.counterAxisAlignItems = 'CENTER';

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

  const periodText = createText(periodLabels[classification.type], 16, 'Bold', periodColor);
  periodBadge.appendChild(periodText);
  mainPeriod.appendChild(periodBadge);

  const commitsText = createText(
    `${classification.totalCommits} commits analyzed`,
    13,
    'Regular',
    colors.textMuted
  );
  mainPeriod.appendChild(commitsText);

  timelineFrame.appendChild(mainPeriod);

  // Breakdown bar
  const breakdownFrame = figma.createFrame();
  breakdownFrame.name = 'Breakdown';
  breakdownFrame.layoutMode = 'HORIZONTAL';
  breakdownFrame.primaryAxisSizingMode = 'FIXED';
  breakdownFrame.counterAxisSizingMode = 'FIXED';
  breakdownFrame.resize(contentWidth, 20);
  breakdownFrame.itemSpacing = 0;
  breakdownFrame.fills = [];

  const segments = [
    { rate: classification.expansionRate, color: colors.success, label: 'Expansion' },
    { rate: classification.cleanupRate, color: colors.error, label: 'Cleanup' },
    { rate: classification.stableRate, color: colors.warning, label: 'Stable' },
  ];

  segments.forEach((segment) => {
    if (segment.rate > 0) {
      const segmentWidth = (segment.rate / 100) * contentWidth;
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

    const label = createText(`${segment.label} ${segment.rate}%`, 13, 'Regular', colors.text);
    legendItem.appendChild(label);

    legendFrame.appendChild(legendItem);
  });

  timelineFrame.appendChild(legendFrame);
  section.appendChild(timelineFrame);

  return section;
}

/**
 * Create list view for high-churn layers
 *
 * Flat section with ranked list of layers by activity count.
 */
function createHighChurnList(
  hotspots: ActivityHotspot[],
  topCount: number,
  colors: TrendColors,
  width: number
): FrameNode {
  const section = createSection(`Top ${topCount} High-Churn Layers`, width, 12);

  const sectionTitle = createText(`TOP ${topCount} HIGH-CHURN LAYERS`, 16, 'Bold', colors.text);
  section.appendChild(sectionTitle);

  if (hotspots.length === 0) {
    const emptyText = createText('No activity data available', 12, 'Regular', colors.textMuted);
    section.appendChild(emptyText);
    return section;
  }

  const topHotspots = hotspots.slice(0, topCount);
  const contentWidth = width - 48;

  const listFrame = figma.createFrame();
  listFrame.name = 'List';
  listFrame.layoutMode = 'VERTICAL';
  listFrame.primaryAxisSizingMode = 'AUTO';
  listFrame.counterAxisSizingMode = 'FIXED';
  listFrame.resize(contentWidth, 100);
  listFrame.itemSpacing = 16;
  listFrame.fills = [];

  topHotspots.forEach((hotspot, index) => {
    const itemFrame = figma.createFrame();
    itemFrame.name = `Item ${index + 1}`;
    itemFrame.layoutMode = 'HORIZONTAL';
    itemFrame.primaryAxisSizingMode = 'AUTO';
    itemFrame.counterAxisSizingMode = 'AUTO';
    itemFrame.itemSpacing = 12;
    itemFrame.fills = [];
    itemFrame.counterAxisAlignItems = 'MIN';

    // Rank badge — fixed 32px min-width, content right-aligned
    const badge = figma.createFrame();
    badge.name = 'Rank';
    badge.layoutMode = 'HORIZONTAL';
    badge.primaryAxisSizingMode = 'FIXED';
    badge.counterAxisSizingMode = 'AUTO';
    badge.resize(32, 20);
    badge.paddingTop = 4;
    badge.paddingBottom = 4;
    badge.paddingLeft = 8;
    badge.paddingRight = 8;
    badge.primaryAxisAlignItems = 'MAX';
    badge.fills = [{ type: 'SOLID', color: colors.primary }];
    badge.cornerRadius = 4;

    const rankText = createText(`#${index + 1}`, 11, 'Bold', colors.background);
    badge.appendChild(rankText);
    itemFrame.appendChild(badge);

    // Layer info
    const infoFrame = figma.createFrame();
    infoFrame.name = 'Info';
    infoFrame.layoutMode = 'VERTICAL';
    infoFrame.primaryAxisSizingMode = 'AUTO';
    infoFrame.counterAxisSizingMode = 'AUTO';
    infoFrame.itemSpacing = 4;
    infoFrame.fills = [];

    const layerName = getLayerName(hotspot.nodeId);
    const nodeText = createText(layerName, 16, 'Medium', colors.text);
    const statsText = createText(
      `${hotspot.activityCount} activities • ${hotspot.commitCount} commits`,
      13,
      'Regular',
      colors.textMuted
    );

    infoFrame.appendChild(nodeText);
    infoFrame.appendChild(statsText);
    itemFrame.appendChild(infoFrame);

    listFrame.appendChild(itemFrame);
  });

  section.appendChild(listFrame);

  return section;
}

/**
 * Create complete trend insights visualization
 *
 * Combines all visualization components into a single frame with a header
 * and flat sections, matching the Trend Insights & Analytics design.
 */
export async function createTrendInsightsSection(
  commits: Commit[],
  config?: TrendVisualizationConfig
): Promise<FrameNode> {
  await loadInterFont();

  const fullConfig: Required<TrendVisualizationConfig> = {
    recentCommits: config?.recentCommits ?? 10,
    topNodesCount: config?.topNodesCount ?? 5,
    width: config?.width ?? 800,
  };

  const { detectTheme } = await import('./theme');
  const theme = detectTheme();
  const colors = getTrendColors(theme);

  const analytics = computeChangelogAnalytics(commits, {
    recentCommitsForNodes: fullConfig.recentCommits,
  });

  // Main container — white background, rounded corners, no padding (sections self-manage)
  const container = figma.createFrame();
  container.name = 'Trend Insights';
  container.layoutMode = 'VERTICAL';
  container.primaryAxisSizingMode = 'AUTO';
  container.counterAxisSizingMode = 'FIXED';
  container.resize(fullConfig.width, 100);
  container.itemSpacing = 0;
  container.fills = [{ type: 'SOLID', color: colors.background }];
  container.cornerRadius = 8;

  // Header — light gray background, large title
  const header = figma.createFrame();
  header.name = 'header';
  header.layoutMode = 'VERTICAL';
  header.primaryAxisSizingMode = 'AUTO';
  header.counterAxisSizingMode = 'FIXED';
  header.resize(fullConfig.width, 100);
  header.paddingTop = 32;
  header.paddingBottom = 12;
  header.paddingLeft = 24;
  header.paddingRight = 24;
  header.fills = [{ type: 'SOLID', color: colors.headerBackground }];

  const title = createText('Trend Insights & Analytics', 24, 'Bold', colors.text);
  header.appendChild(title);
  container.appendChild(header);

  // Sections
  const fileGrowthSection = createFileGrowthChart(
    commits,
    analytics.fileGrowth,
    colors,
    fullConfig.width
  );
  container.appendChild(fileGrowthSection);

  const periodSection = createPeriodTimeline(
    analytics.periodClassification,
    colors,
    fullConfig.width
  );
  container.appendChild(periodSection);

  const highChurnSection = createHighChurnList(
    analytics.activeNodes.hotspots,
    fullConfig.topNodesCount,
    colors,
    fullConfig.width
  );
  container.appendChild(highChurnSection);

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

  const trendInsights = await createTrendInsightsSection(commits, config);
  changelogPage.appendChild(trendInsights);

  trendInsights.x = -900;
  trendInsights.y = 400;

  return trendInsights;
}
