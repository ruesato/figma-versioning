/**
 * Changelog Page Manager
 *
 * Handles finding and creating the Changelog page.
 * Strategy: Find by exact name match "Changelog", create if not found.
 * Handles edge cases: recreates if user deletes or renames the page.
 */

const CHANGELOG_PAGE_NAME = 'Changelog';

/**
 * Find the Changelog page by exact name match
 * @returns The Changelog page if found, null otherwise
 */
export function findChangelogPage(): PageNode | null {
  // Search through all pages in the document
  for (const page of figma.root.children) {
    if (page.type === 'PAGE' && page.name === CHANGELOG_PAGE_NAME) {
      return page;
    }
  }
  return null;
}

/**
 * Create a new Changelog page
 * @returns The newly created Changelog page
 */
export function createChangelogPage(): PageNode {
  const page = figma.createPage();
  page.name = CHANGELOG_PAGE_NAME;
  return page;
}

/**
 * Get or create the Changelog page.
 * If the page exists, loads it before returning so downstream code
 * can safely access page.children (required for dynamic-page mode).
 *
 * @returns The Changelog page (existing or newly created)
 */
export async function getOrCreateChangelogPage(): Promise<PageNode> {
  const existingPage = findChangelogPage();

  if (existingPage) {
    console.log('[PageManager] Found existing Changelog page, loading...');
    await existingPage.loadAsync();
    console.log('[PageManager] Changelog page loaded, children:', existingPage.children.length);
    return existingPage;
  }

  console.log('[PageManager] Creating new Changelog page...');
  const newPage = createChangelogPage();
  console.log('[PageManager] Changelog page created');
  return newPage;
}

/**
 * Check if the Changelog page exists
 * @returns True if the Changelog page exists, false otherwise
 */
export function changelogPageExists(): boolean {
  return findChangelogPage() !== null;
}
