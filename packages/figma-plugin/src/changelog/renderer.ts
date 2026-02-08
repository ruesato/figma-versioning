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
export function getOrCreateContainerFrame(): FrameNode {
  const page = getOrCreateChangelogPage();

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
  const container = getOrCreateContainerFrame();

  // Get the changelog page
  const changelogPage = getOrCreateChangelogPage();

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
export function findContainerFrame(): FrameNode | null {
  const page = getOrCreateChangelogPage();

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
export function clearChangelogContainer(): void {
  const container = findContainerFrame();
  if (container) {
    container.remove();
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
  onProgress?: (current: number, total: number) => void
): Promise<Record<string, string>> {
  // Handle empty commits
  if (commits.length === 0) {
    console.log('[Rebuild] No commits to rebuild');
    return {};
  }

  console.log(`[Rebuild] Starting rebuild of ${commits.length} commits`);

  // Clear existing container
  clearChangelogContainer();

  // Sort commits chronologically (oldest first) so we can render in order
  // This ensures newest ends up at index 0 when we insert
  const sortedCommits = [...commits].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  // Map to store new frame IDs
  const frameIdMap: Record<string, string> = {};

  // Render each commit oldest to newest
  for (let i = 0; i < sortedCommits.length; i++) {
    const commit = sortedCommits[i];

    if (onProgress) {
      onProgress(i + 1, sortedCommits.length);
    }

    try {
      // Create the commit entry frame
      const entryFrame = await createCommitEntryFrame(commit);

      // Get or create the container (will be created on first iteration)
      const container = getOrCreateContainerFrame();

      // Unlock container temporarily to add entry
      container.locked = false;

      // Insert at start (index 0) for reverse chronological order
      // Since we're iterating oldest to newest, the newest will end up at index 0
      container.insertChild(0, entryFrame);

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
  const changelogPage = getOrCreateChangelogPage();
  figma.currentPage = changelogPage;

  // Scroll to show the container
  const container = findContainerFrame();
  if (container) {
    figma.viewport.scrollAndZoomIntoView([container]);
  }

  console.log(`[Rebuild] Completed rebuild of ${Object.keys(frameIdMap).length} commits`);

  return frameIdMap;
}
