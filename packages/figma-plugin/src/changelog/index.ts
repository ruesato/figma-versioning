/**
 * Changelog Module Public API
 *
 * Exports public functions and types for changelog rendering.
 */

// Renderer exports
export {
  renderChangelogEntry,
  getOrCreateContainerFrame,
  findContainerFrame,
  clearChangelogContainer,
  rebuildChangelog,
} from './renderer';

// Theme exports
export { detectTheme, getThemeColors } from './theme';
export type { Theme, ThemeColors } from './theme';

// Page manager exports
export { getOrCreateChangelogPage, findChangelogPage, changelogPageExists } from './page-manager';

// Frame builder exports (internal use, but available if needed)
export { createCommitEntryFrame } from './frame-builder';

// Histogram exports
export {
  calculateHistogramData,
  calculateBarHeight,
  formatBarTooltip,
  getHistogramColors,
  renderHistogramOnChangelogPage,
  navigateFromHistogramBar,
  setupHistogramInteractivity,
} from './histogram';
export type { HistogramBar, HistogramConfig, HistogramColors } from './histogram';

// Property utilities exports
export { getPropertyLabel, getSupportedPropertyNames, hasPropertyLabel } from './property-labels';
export { formatPropertyValue, formatProperty } from './property-formatter';
