/**
 * Changelog Renderer
 *
 * Manages the changelog page layout and entry rendering.
 * Entries are inserted in reverse chronological order (newest at top).
 */

import type { Commit } from '@figma-versioning/core';
import { getOrCreateChangelogPage } from './page-manager';
import { createCommitEntryFrame } from './frame-builder';
import { detectTheme, getThemeColors } from './theme';

/**
 * Compare two version strings for sorting
 * Handles both semantic versions (1.2.3) and date-based versions (2026-01-15.1)
 *
 * @param a - First version string
 * @param b - Second version string
 * @returns Negative if a < b, positive if a > b, 0 if equal
 */
function compareVersions(a: string, b: string): number {
  // Try semantic version comparison first (e.g., "1.2.3")
  const semverRegex = /^(\d+)\.(\d+)\.(\d+)$/;
  const aMatch = a.match(semverRegex);
  const bMatch = b.match(semverRegex);

  if (aMatch && bMatch) {
    // Both are semantic versions
    const aMajor = parseInt(aMatch[1], 10);
    const aMinor = parseInt(aMatch[2], 10);
    const aPatch = parseInt(aMatch[3], 10);
    const bMajor = parseInt(bMatch[1], 10);
    const bMinor = parseInt(bMatch[2], 10);
    const bPatch = parseInt(bMatch[3], 10);

    if (aMajor !== bMajor) return aMajor - bMajor;
    if (aMinor !== bMinor) return aMinor - bMinor;
    return aPatch - bPatch;
  }

  // Try date-based version comparison (e.g., "2026-01-15" or "2026-01-15.1")
  const dateRegex = /^(\d{4})-(\d{2})-(\d{2})(?:\.(\d+))?$/;
  const aDateMatch = a.match(dateRegex);
  const bDateMatch = b.match(dateRegex);

  if (aDateMatch && bDateMatch) {
    // Both are date-based versions
    const aDate = new Date(parseInt(aDateMatch[1], 10), parseInt(aDateMatch[2], 10) - 1, parseInt(aDateMatch[3], 10));
    const bDate = new Date(parseInt(bDateMatch[1], 10), parseInt(bDateMatch[2], 10) - 1, parseInt(bDateMatch[3], 10));
    const dateDiff = aDate.getTime() - bDate.getTime();

    if (dateDiff !== 0) return dateDiff;

    // Same date, compare sequence numbers
    const aSeq = aDateMatch[4] ? parseInt(aDateMatch[4], 10) : 0;
    const bSeq = bDateMatch[4] ? parseInt(bDateMatch[4], 10) : 0;
    return aSeq - bSeq;
  }

  // Fallback to string comparison
  return a.localeCompare(b);
}

const CONTAINER_NAME = 'Changelog Entries';
const CONTAINER_X = 100;
const CONTAINER_Y = 400;
const ENTRY_SPACING = 32;

/**
 * Get or create the container frame for changelog entries
 * Creates a horizontal auto-layout frame at a fixed position if it doesn't exist
 *
 * @returns The container frame for changelog entries
 */
export async function getOrCreateContainerFrame(): Promise<FrameNode> {
  const page = await getOrCreateChangelogPage();

  // Search for existing container frame
  for (const node of page.children) {
    if (node.type === 'FRAME' && node.name === CONTAINER_NAME) {
      return node as FrameNode;
    }
  }

  // Create new container frame if not found
  const theme = detectTheme();
  const colors = getThemeColors(theme);

  const container = figma.createFrame();
  container.name = CONTAINER_NAME;
  container.x = CONTAINER_X;
  container.y = CONTAINER_Y;

  // Configure auto-layout
  container.layoutMode = 'HORIZONTAL';
  container.primaryAxisSizingMode = 'AUTO';
  container.counterAxisSizingMode = 'AUTO';
  container.itemSpacing = ENTRY_SPACING;
  container.paddingTop = 0;
  container.paddingBottom = 0;
  container.paddingLeft = 0;
  container.paddingRight = 0;

  // Set background to match theme
  container.fills = [{ type: 'SOLID', color: colors.background, opacity: 0 }];

  // Lock the container
  container.locked = true;

  // Add to page
  page.appendChild(container);

  return container;
}

/**
 * Render a new changelog entry for the given commit
 * Inserts the entry at the start of the container (index 0) for reverse chronological order
 * Navigates to the entry in the viewport for visual feedback
 *
 * @param commit - The commit data to render
 * @returns The created commit entry frame
 */
export async function renderChangelogEntry(commit: Commit): Promise<FrameNode> {
  // Create the commit entry frame
  const entryFrame = await createCommitEntryFrame(commit);

  // Get or create the container
  const container = await getOrCreateContainerFrame();

  // Get the changelog page
  const changelogPage = await getOrCreateChangelogPage();

  // Unlock container temporarily to add entry
  container.locked = false;

  // Insert at start (index 0) for reverse chronological order (newest first)
  container.insertChild(0, entryFrame);

  // Re-lock the container
  container.locked = true;

  // Navigate to the new entry for visual feedback
  // Switch to Changelog page
  figma.currentPage = changelogPage;

  // Scroll viewport to the entry
  figma.viewport.scrollAndZoomIntoView([entryFrame]);

  // Select the frame for visual feedback
  figma.currentPage.selection = [entryFrame];

  return entryFrame;
}

/**
 * Find and return the existing container frame if it exists
 *
 * @returns The container frame or null if not found
 */
export async function findContainerFrame(): Promise<FrameNode | null> {
  const page = await getOrCreateChangelogPage();

  for (const node of page.children) {
    if (node.type === 'FRAME' && node.name === CONTAINER_NAME) {
      return node as FrameNode;
    }
  }

  return null;
}

/**
 * Remove the existing changelog entries container if it exists
 * This clears all rendered changelog entries from the canvas
 */
export async function clearChangelogContainer(): Promise<void> {
  const page = await getOrCreateChangelogPage();

  // Find and remove ALL containers with the matching name (in case of duplicates)
  const containersToRemove: SceneNode[] = [];
  for (const node of page.children) {
    if (node.type === 'FRAME' && node.name === CONTAINER_NAME) {
      containersToRemove.push(node);
    }
  }

  console.log(`[Rebuild] Found ${containersToRemove.length} container(s) to remove`);

  for (const container of containersToRemove) {
    if (container.type === 'FRAME') {
      // Unlock container before removing
      container.locked = false;

      // Count children
      const childCount = container.children.length;
      console.log(`[Rebuild] Removing container with ${childCount} children`);

      // Remove all children first
      while (container.children.length > 0) {
        container.children[0].remove();
      }

      // Then remove the container itself
      container.remove();
    }
  }
}

/**
 * Rebuild the entire changelog from stored commits
 * Clears existing entries and re-renders all commits in chronological order
 *
 * @param commits - Array of commits to render (should be sorted newest first)
 * @param onProgress - Optional callback for progress updates (current, total)
 * @returns Object containing the rebuilt frame IDs mapped by commit ID
 */
export async function rebuildChangelog(
  commits: Commit[],
  onProgress?: (_current: number, _total: number) => void
): Promise<Record<string, string>> {
  // Handle empty commits
  if (commits.length === 0) {
    console.log('[Rebuild] No commits to rebuild');
    return {};
  }

  console.log(`[Rebuild] Starting rebuild of ${commits.length} commits`);
  console.log(`[Rebuild] Commit versions:`, commits.map(c => c.version).join(', '));

  // Clear existing container
  await clearChangelogContainer();

  // Sort commits by version (newest first)
  // Use version comparison for proper semantic/date-based ordering
  const sortedCommits = [...commits].sort((a, b) => {
    // Compare versions in descending order (newest first)
    const versionCompare = compareVersions(b.version, a.version);
    if (versionCompare !== 0) return versionCompare;

    // If versions are equal (shouldn't happen), fall back to timestamp
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });

  console.log(`[Rebuild] Sorted versions:`, sortedCommits.map(c => c.version).join(', '));

  // Map to store new frame IDs
  const frameIdMap: Record<string, string> = {};

  // Render each commit newest to oldest, appending each
  for (let i = 0; i < sortedCommits.length; i++) {
    const commit = sortedCommits[i];

    if (onProgress) {
      onProgress(i + 1, sortedCommits.length);
    }

    try {
      // Create the commit entry frame
      const entryFrame = await createCommitEntryFrame(commit);

      // Get or create the container (will be created on first iteration)
      const container = await getOrCreateContainerFrame();

      // Unlock container temporarily to add entry
      container.locked = false;

      // Append to end (newest first in array, so newest ends at leftmost position)
      container.appendChild(entryFrame);

      // Re-lock the container
      container.locked = true;

      // Store the new frame ID
      frameIdMap[commit.id] = entryFrame.id;

      console.log(`[Rebuild] Rendered commit ${i + 1}/${sortedCommits.length}: ${commit.version}`);
    } catch (error) {
      console.error(`[Rebuild] Failed to render commit ${commit.id}:`, error);
      // Continue with remaining commits even if one fails
    }
  }

  // Navigate to the changelog page to show the rebuilt changelog
  const changelogPage = await getOrCreateChangelogPage();
  figma.currentPage = changelogPage;

  // Scroll to show the container
  const container = await findContainerFrame();
  if (container) {
    figma.viewport.scrollAndZoomIntoView([container]);
  }

  console.log(`[Rebuild] Completed rebuild of ${Object.keys(frameIdMap).length} commits`);

  return frameIdMap;
}
