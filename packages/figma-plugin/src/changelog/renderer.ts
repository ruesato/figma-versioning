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
