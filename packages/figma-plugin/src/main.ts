import { once, on, emit, showUI } from '@create-figma-plugin/utilities';
import { getNextSemanticVersion, getNextDateVersion } from '@figma-versioning/core';
import type { VersionIncrement, Comment, Annotation, CommitMetrics, Commit, ChangelogMeta, PreCommitStats, PageChangeStats, DevStatusChange, LayerDevStatus } from '@figma-versioning/core';
import { renderChangelogEntry, setupHistogramInteractivity } from './changelog';

const PAT_STORAGE_KEY = 'figma_versioning_pat';
const VERSIONING_MODE_KEY = 'figma_versioning_mode';
const CURRENT_VERSION_KEY = 'figma_versioning_current_version';
const CHANGELOG_META_KEY = 'figma_versioning_changelog_meta';
const COMMIT_CHUNK_PREFIX = 'figma_versioning_commit_chunk_';

// SharedPluginData keys for backup storage
const SHARED_PLUGIN_NAMESPACE = 'figma_versioning';
const SHARED_PLUGIN_COMMITS_KEY = 'commits_backup';
const MIGRATION_FLAG_KEY = 'migration_backfill_v1';

// Cached file key - requires enablePrivatePluginApi in manifest
let cachedFileKey: string | null = null;

// loadCommits() cache to avoid redundant calls during version creation
let commitsCache: { result: Commit[]; timestamp: number } | null = null;
const COMMITS_CACHE_TTL_MS = 5000; // 5 second TTL

/**
 * In-memory change tracking store
 * Tracks document changes by page since plugin was opened
 */
interface PageChangeTracker {
  nodesAdded: Set<string>;
  nodesRemoved: Set<string>;
  nodesModified: Set<string>;
}

const changeTrackingStore: Map<string, PageChangeTracker> = new Map();
let isChangeTrackingActive = false;

/**
 * Get or create a page change tracker
 */
function getPageTracker(pageId: string): PageChangeTracker {
  if (!changeTrackingStore.has(pageId)) {
    changeTrackingStore.set(pageId, {
      nodesAdded: new Set(),
      nodesRemoved: new Set(),
      nodesModified: new Set()
    });
  }
  return changeTrackingStore.get(pageId)!;
}

/**
 * Get the page ID for a given node
 */
async function getPageIdForNode(nodeId: string): Promise<string | null> {
  try {
    const node = await figma.getNodeByIdAsync(nodeId);
    if (!node) return null;

    let current: BaseNode | null = node;
    while (current && current.type !== 'PAGE') {
      current = current.parent;
    }

    return current?.id || null;
  } catch (error) {
    console.error('[ChangeTracking] Error getting page for node:', error);
    return null;
  }
}

/**
 * Reset change tracking store
 */
function resetChangeTracking(): void {
  changeTrackingStore.clear();
  console.log('[ChangeTracking] Store reset');
}

interface DevStatusNodeInfo {
  status: LayerDevStatus;
  pageId: string;
  pageName: string;
  nodeName: string;
}

/**
 * Scan all pages and collect every layer that has a dev status set.
 * Uses loadAsync() + findAllWithCriteria for dramatically faster traversal.
 */
async function collectAllDevStatuses(): Promise<Record<string, DevStatusNodeInfo>> {
  const result: Record<string, DevStatusNodeInfo> = {};

  // Node types that can have devStatus
  const candidateTypes: NodeType[] = ['FRAME', 'COMPONENT', 'COMPONENT_SET', 'INSTANCE', 'SECTION'];

  for (const page of figma.root.children) {
    // Load page data before accessing children (required for dynamic-page)
    await page.loadAsync();

    const candidates = page.findAllWithCriteria({ types: candidateTypes });
    for (const node of candidates) {
      if ('devStatus' in node && node.devStatus) {
        const rawStatus = node.devStatus as { type: string } | null;
        if (rawStatus && (rawStatus.type === 'READY_FOR_DEV' || rawStatus.type === 'COMPLETED')) {
          result[node.id] = {
            status: rawStatus.type as LayerDevStatus,
            pageId: page.id,
            pageName: page.name,
            nodeName: node.name
          };
        }
      }
    }
  }

  return result;
}

/**
 * Compute dev status changes by diffing current statuses against the previous commit's snapshot
 */
function computeDevStatusChanges(
  current: Record<string, DevStatusNodeInfo>,
  previousSnapshot: Record<string, { status: LayerDevStatus; pageId: string; pageName: string; nodeName: string }> | undefined
): DevStatusChange[] {
  const changes: DevStatusChange[] = [];
  const prev = previousSnapshot || {};

  // New or changed statuses
  for (const [nodeId, info] of Object.entries(current)) {
    const prevEntry = prev[nodeId];
    const prevStatus: LayerDevStatus | null = prevEntry ? prevEntry.status : null;

    if (prevStatus !== info.status) {
      changes.push({
        pageId: info.pageId,
        pageName: info.pageName,
        nodeId,
        layerName: info.nodeName,
        previousStatus: prevStatus,
        newStatus: info.status
      });
    }
  }

  // Statuses that were cleared (in previous snapshot but not in current)
  for (const [nodeId, prevEntry] of Object.entries(prev)) {
    if (!(nodeId in current)) {
      changes.push({
        pageId: prevEntry.pageId,
        pageName: prevEntry.pageName,
        nodeId,
        layerName: prevEntry.nodeName,
        previousStatus: prevEntry.status,
        newStatus: null
      });
    }
  }

  return changes;
}

/**
 * Get current pre-commit stats
 */
async function getPreCommitStats(): Promise<PreCommitStats> {
  console.log('[ChangeTracking] Getting pre-commit stats...');
  console.log('[ChangeTracking] Tracking active:', isChangeTrackingActive);
  console.log('[ChangeTracking] Pages being tracked:', changeTrackingStore.size);

  // Load previous commits, then fetch comments and annotations in parallel
  const existingCommits = await loadCommits();

  const [commentsResult, allAnnotations] = await Promise.all([
    fetchComments(),
    collectAnnotations()
  ]);

  // Filter to new comments
  const allComments = commentsResult.success ? commentsResult.comments || [] : [];
  const allPreviousComments = existingCommits.flatMap(commit => commit.comments || []);
  const newComments = filterNewComments(allComments, allPreviousComments);

  // Filter to new annotations
  const allPreviousAnnotations = existingCommits.flatMap(commit => commit.annotations || []);
  const newAnnotations = filterNewAnnotations(allAnnotations, allPreviousAnnotations);

  // Build page change stats from tracking store
  const pageChanges: PageChangeStats[] = [];

  const entries = Array.from(changeTrackingStore.entries());
  for (const entry of entries) {
    const pageId = entry[0];
    const tracker = entry[1];

    const page = await figma.getNodeByIdAsync(pageId) as PageNode | null;
    if (!page) continue;

    const nodesAdded = tracker.nodesAdded.size;
    const nodesRemoved = tracker.nodesRemoved.size;
    const nodesModified = tracker.nodesModified.size;

    console.log(`[ChangeTracking] Page "${page.name}": +${nodesAdded} ~${nodesModified} -${nodesRemoved}`);

    // Only include pages with changes
    if (nodesAdded > 0 || nodesRemoved > 0 || nodesModified > 0) {
      pageChanges.push({
        pageId: page.id,
        pageName: page.name,
        nodesAdded,
        nodesRemoved,
        nodesModified,
        totalDelta: nodesAdded - nodesRemoved
      });
    }
  }

  console.log(`[ChangeTracking] Stats: ${newComments.length} comments, ${newAnnotations.length} annotations, ${pageChanges.length} pages with changes`);

  return {
    newCommentsCount: newComments.length,
    newAnnotationsCount: newAnnotations.length,
    pageChanges,
    hasRealTimeTracking: isChangeTrackingActive
  };
}

function getFileKey(): string | null {
  if (cachedFileKey) return cachedFileKey;
  try {
    cachedFileKey = figma.fileKey || null;
    return cachedFileKey;
  } catch (error) {
    console.error('[FileKey] Error accessing figma.fileKey:', error);
    return null;
  }
}

/**
 * Check if PAT exists in storage
 */
async function checkPatExists(): Promise<boolean> {
  try {
    const pat = await figma.clientStorage.getAsync(PAT_STORAGE_KEY);
    return !!pat;
  } catch (error) {
    console.error('Error checking PAT:', error);
    return false;
  }
}

/**
 * Store PAT securely in clientStorage
 */
async function storePat(pat: string): Promise<void> {
  await figma.clientStorage.setAsync(PAT_STORAGE_KEY, pat);
}

/**
 * Retrieve stored PAT
 */
async function getPat(): Promise<string | null> {
  try {
    return await figma.clientStorage.getAsync(PAT_STORAGE_KEY);
  } catch (error) {
    console.error('Error retrieving PAT:', error);
    return null;
  }
}

/**
 * Remove PAT from storage
 */
async function removePat(): Promise<void> {
  await figma.clientStorage.deleteAsync(PAT_STORAGE_KEY);
}

/**
 * Get stored versioning mode (defaults to 'semantic')
 */
async function getVersioningMode(): Promise<'semantic' | 'date-based'> {
  try {
    const mode = await figma.clientStorage.getAsync(VERSIONING_MODE_KEY);
    return mode === 'date-based' ? 'date-based' : 'semantic';
  } catch (error) {
    console.error('Error retrieving versioning mode:', error);
    return 'semantic';
  }
}

/**
 * Store versioning mode
 */
async function setVersioningMode(mode: 'semantic' | 'date-based'): Promise<void> {
  await figma.clientStorage.setAsync(VERSIONING_MODE_KEY, mode);
}

/**
 * Get current semantic version (null if not set)
 */
async function getCurrentVersion(): Promise<string | null> {
  try {
    return await figma.clientStorage.getAsync(CURRENT_VERSION_KEY);
  } catch (error) {
    console.error('Error retrieving current version:', error);
    return null;
  }
}

/**
 * Calculate the next semantic version based on increment type
 */
async function calculateNextSemanticVersion(increment: VersionIncrement): Promise<string> {
  const currentVersion = await getCurrentVersion();
  return getNextSemanticVersion(currentVersion, increment);
}

/**
 * Calculate the next date-based version
 */
async function calculateNextDateVersion(): Promise<string> {
  const currentVersion = await getCurrentVersion();
  return getNextDateVersion(currentVersion);
}

/**
 * Update the current version in storage
 */
async function updateCurrentVersion(version: string): Promise<void> {
  await figma.clientStorage.setAsync(CURRENT_VERSION_KEY, version);
}

/**
 * Fetch comments from Figma REST API
 */
async function fetchComments(): Promise<{ success: boolean; comments?: Comment[]; error?: string }> {
  try {
    // Get the PAT from storage
    const pat = await getPat();
    if (!pat) {
      console.warn('[Comments] No PAT configured - skipping comment fetch');
      return { success: false, error: 'No Personal Access Token found. Please configure it in settings.' };
    }

    // Get file key when needed
    const fileKey = getFileKey();
    if (!fileKey) {
      console.error('[Comments] Unable to determine file key - figma.fileKey is not available');
      return { success: false, error: 'Unable to determine current file. Please ensure a file is open.' };
    }

    console.log(`[Comments] File key: ${fileKey}`);
    console.log('[Comments] Fetching comments from Figma API...');

    // Fetch comments from Figma API
    const response = await fetch(`https://api.figma.com/v1/files/${fileKey}/comments`, {
      headers: {
        'X-Figma-Token': pat
      }
    });

    if (!response.ok) {
      const errorMsg = `API error: ${response.status} ${response.statusText}`;
      console.error(`[Comments] ${errorMsg}`);
      if (response.status === 403) {
        return { success: false, error: 'Invalid or expired token. Please update your PAT in settings.' };
      }
      return { success: false, error: errorMsg };
    }

    const data = await response.json();
    const rawComments = data.comments || [];
    console.log(`[Comments] Received ${rawComments.length} comments from API`);

    // Transform Figma comments to our format
    const comments: Comment[] = rawComments.map((comment: any) => ({
      id: comment.id,
      author: {
        name: comment.user?.handle || 'Unknown',
        email: comment.user?.email
      },
      timestamp: new Date(comment.created_at),
      text: comment.message,
      nodeId: comment.client_meta?.node_id,
      parentId: comment.parent_id
    }));

    console.log(`[Comments] Successfully transformed ${comments.length} comments`);
    return { success: true, comments };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Failed to fetch comments';
    console.error(`[Comments] Error: ${errorMsg}`, error);
    return {
      success: false,
      error: errorMsg
    };
  }
}

/**
 * Raw annotation collected during tree traversal (before category resolution)
 */
interface RawAnnotation {
  annotation: any;
  nodeId: string;
  nodeName: string;
}

/**
 * Collect all annotations from the current page.
 * Uses native findAll for fast traversal; category lookups are batched and parallelized.
 */
async function collectAnnotations(): Promise<Annotation[]> {
  const currentPage = figma.currentPage;

  // Phase 1: Use native findAll to find annotated nodes in one pass
  const annotatedNodes = currentPage.findAll(
    n => 'annotations' in n && Array.isArray(n.annotations) && n.annotations.length > 0
  );

  const raw: RawAnnotation[] = [];
  for (const node of annotatedNodes) {
    if ('annotations' in node && Array.isArray(node.annotations)) {
      for (const annotation of node.annotations) {
        raw.push({ annotation, nodeId: node.id, nodeName: node.name });
      }
    }
  }

  if (raw.length === 0) return [];

  // Phase 2: Batch-resolve unique category IDs in parallel
  const uniqueCategoryIds = new Set<string>();
  for (const { annotation } of raw) {
    if (annotation.categoryId) uniqueCategoryIds.add(annotation.categoryId);
  }

  const categoryMap = new Map<string, string>();
  if (uniqueCategoryIds.size > 0) {
    const categoryEntries = await Promise.all(
      Array.from(uniqueCategoryIds).map(async (id) => {
        try {
          const category = await figma.annotations.getAnnotationCategoryByIdAsync(id);
          return [id, category?.label] as const;
        } catch {
          return [id, undefined] as const;
        }
      })
    );
    for (const [id, label] of categoryEntries) {
      if (label) categoryMap.set(id, label);
    }
  }

  // Phase 3: Build final annotation objects (synchronous)
  return raw.map(({ annotation, nodeId, nodeName }) => {
    const categoryLabel = annotation.categoryId ? categoryMap.get(annotation.categoryId) : undefined;
    return {
      label: annotation.label || '',
      nodeId,
      isPinned: true,
      properties: {
        ...annotation,
        ...(categoryLabel && { category: categoryLabel }),
        nodeName
      }
    };
  });
}

/**
 * Generate a fingerprint for a comment to detect duplicates across versions
 * Uses comment ID as primary key (most reliable), with content fallback
 */
function commentFingerprint(c: Comment): string {
  // Use comment ID as the primary fingerprint (most reliable)
  // Fall back to content-based fingerprint if ID is missing (legacy comments)
  return c.id || `${c.author.name}|${c.text}|${c.nodeId || ''}`;
}

/**
 * Filter comments to only those not seen in previous commits
 * Uses fingerprint-based deduplication (matching author|text|nodeId) instead of timestamps
 * to avoid clock skew issues between client (new Date()) and Figma server (comment created_at)
 */
function filterNewComments(current: Comment[], allPrevious: Comment[]): Comment[] {
  if (allPrevious.length === 0) {
    console.log('[Comments] No previous comments, returning all comments');
    return current;
  }

  console.log('[Comments] =================================');
  console.log('[Comments] Filtering comments using fingerprint-based deduplication');
  console.log('[Comments] Current comments:', current.length);
  console.log('[Comments] Previous comments:', allPrevious.length);

  const previousFingerprints = new Set(allPrevious.map(commentFingerprint));
  const newComments = current.filter(c => {
    const fingerprint = commentFingerprint(c);
    const isNew = !previousFingerprints.has(fingerprint);

    if (isNew) {
      console.log(`[Comments] NEW comment: "${c.text.substring(0, 30)}..." by ${c.author.name}`);
    } else {
      console.log(`[Comments] Duplicate comment (skipping): "${c.text.substring(0, 30)}..." by ${c.author.name}`);
    }

    return isNew;
  });

  console.log(`[Comments] Filtered to ${newComments.length} new comments`);
  console.log('[Comments] =================================');
  return newComments;
}

function annotationFingerprint(a: Annotation): string {
  const propsStr = a.properties
    ? JSON.stringify(a.properties, Object.keys(a.properties).sort())
    : '';
  return `${a.label}|${a.nodeId}|${propsStr}`;
}

/**
 * Filter annotations to only those not seen in any previous commits
 * This handles the case where a previous commit had 0 annotations - we still filter against all historical annotations
 */
function filterNewAnnotations(current: Annotation[], allPrevious: Annotation[]): Annotation[] {
  if (allPrevious.length === 0) {
    return current;
  }
  const previousFingerprints = new Set(allPrevious.map(annotationFingerprint));
  return current.filter(a => !previousFingerprints.has(annotationFingerprint(a)));
}

/**
 * Collect node metrics from the current page using native findAllWithCriteria.
 * Current page is already loaded, so no loadAsync() needed.
 */
function collectMetrics(feedbackCount: number): CommitMetrics {
  const currentPage = figma.currentPage;

  const frames = currentPage.findAllWithCriteria({ types: ['FRAME'] }).length;
  const components = currentPage.findAllWithCriteria({ types: ['COMPONENT', 'COMPONENT_SET'] }).length;
  const instances = currentPage.findAllWithCriteria({ types: ['INSTANCE'] }).length;
  const textNodes = currentPage.findAllWithCriteria({ types: ['TEXT'] }).length;
  const totalNodes = currentPage.findAll().length;

  return {
    totalNodes,
    frames,
    components,
    instances,
    textNodes,
    feedbackCount
  };
}

/**
 * Get changelog metadata
 */
async function getChangelogMeta(): Promise<ChangelogMeta> {
  try {
    const meta = await figma.clientStorage.getAsync(CHANGELOG_META_KEY);
    if (meta) {
      return meta as ChangelogMeta;
    }
  } catch (error) {
    console.error('Error loading changelog meta:', error);
  }

  // Return default metadata
  const mode = await getVersioningMode();
  return {
    version: 1,
    mode,
    chunkCount: 0
  };
}

/**
 * Save changelog metadata
 */
async function saveChangelogMeta(meta: ChangelogMeta): Promise<void> {
  await figma.clientStorage.setAsync(CHANGELOG_META_KEY, meta);
}

/**
 * Migrate legacy commit format and ensure proper types
 * - Converts 'message' field to 'title/description' format
 * - Ensures timestamp is a Date object (JSON serialization converts to string)
 */
function migrateLegacyCommit(commit: any): Commit {
  // Ensure timestamp is a Date object (gets serialized to string in storage)
  let timestamp: Date;
  if (commit.timestamp instanceof Date) {
    timestamp = commit.timestamp;
  } else if (commit.timestamp) {
    timestamp = new Date(commit.timestamp);
    // Validate that the timestamp is valid
    if (isNaN(timestamp.getTime())) {
      console.warn(`[Migration] Invalid timestamp for commit ${commit.id}: ${commit.timestamp}, using current time`);
      timestamp = new Date();
    }
  } else {
    console.warn(`[Migration] Missing timestamp for commit ${commit.id}, using current time`);
    timestamp = new Date();
  }

  // If commit already has title field, it's in the new format
  if ('title' in commit) {
    return { ...commit, timestamp } as Commit;
  }

  // Legacy commit with 'message' field - migrate to new format
  // Use message as title, leave description empty
  const { message, ...rest } = commit;
  return {
    ...rest,
    timestamp,
    title: message || 'Untitled',
    description: undefined
  } as Commit;
}

/**
 * One-time migration: Backfill existing clientStorage commits to sharedPluginData
 * Only runs once on first launch after this feature is deployed
 */
async function migrateCommitsToSharedPluginData(): Promise<void> {
  try {
    // Check if migration has already been done
    const migrationFlag = figma.root.getSharedPluginData(
      SHARED_PLUGIN_NAMESPACE,
      MIGRATION_FLAG_KEY
    );

    if (migrationFlag === 'true') {
      return;
    }

    // Check if sharedPluginData already has commits
    const existingBackup = figma.root.getSharedPluginData(
      SHARED_PLUGIN_NAMESPACE,
      SHARED_PLUGIN_COMMITS_KEY
    );

    if (existingBackup) {
      console.log('[Migration] sharedPluginData already has commits, skipping backfill');
      figma.root.setSharedPluginData(SHARED_PLUGIN_NAMESPACE, MIGRATION_FLAG_KEY, 'true');
      return;
    }

    // Load commits from clientStorage
    const meta = await getChangelogMeta();
    const commits: Commit[] = [];

    for (let i = 0; i < meta.chunkCount; i++) {
      try {
        const chunk = await figma.clientStorage.getAsync(`${COMMIT_CHUNK_PREFIX}${i}`);
        if (chunk && Array.isArray(chunk)) {
          commits.push(...chunk);
        }
      } catch (error) {
        console.error(`[Migration] Error loading chunk ${i}:`, error);
      }
    }

    // If we have commits in clientStorage, backfill to sharedPluginData
    if (commits.length > 0) {
      console.log(`[Migration] Backfilling ${commits.length} commits to sharedPluginData...`);

      const serializedCommits = JSON.parse(JSON.stringify(commits));
      figma.root.setSharedPluginData(
        SHARED_PLUGIN_NAMESPACE,
        SHARED_PLUGIN_COMMITS_KEY,
        JSON.stringify(serializedCommits)
      );

      console.log('[Migration] ✓ Backfill complete');
    }

    // Set migration flag to prevent running again
    figma.root.setSharedPluginData(SHARED_PLUGIN_NAMESPACE, MIGRATION_FLAG_KEY, 'true');
  } catch (error) {
    console.error('[Migration] ⚠ Failed to run backfill migration:', error);
    // Non-fatal: don't block plugin startup
  }
}

/**
 * Load all commits from storage chunks
 */
async function loadCommits(): Promise<Commit[]> {
  // Return cached result if fresh
  if (commitsCache && (Date.now() - commitsCache.timestamp) < COMMITS_CACHE_TTL_MS) {
    return commitsCache.result;
  }

  const meta = await getChangelogMeta();

  // Load all chunks in parallel instead of sequentially
  const chunkPromises = Array.from({ length: meta.chunkCount }, (_, i) =>
    figma.clientStorage.getAsync(`${COMMIT_CHUNK_PREFIX}${i}`).catch(error => {
      console.error(`Error loading commit chunk ${i}:`, error);
      return null;
    })
  );

  const chunks = await Promise.all(chunkPromises);
  const commits: Commit[] = [];
  for (const chunk of chunks) {
    if (chunk && Array.isArray(chunk)) {
      const migratedChunk = chunk.map(migrateLegacyCommit);
      commits.push(...migratedChunk);
    }
  }

  // Fallback: If clientStorage is empty, try to restore from sharedPluginData
  if (commits.length === 0) {
    try {
      const backupData = figma.root.getSharedPluginData(
        SHARED_PLUGIN_NAMESPACE,
        SHARED_PLUGIN_COMMITS_KEY
      );

      if (backupData) {
        console.log('[Storage] clientStorage empty, restoring from sharedPluginData backup');
        const parsedCommits = JSON.parse(backupData);

        if (Array.isArray(parsedCommits) && parsedCommits.length > 0) {
          // Restore Date objects (they were serialized as strings)
          const restoredCommits = parsedCommits.map(c => ({
            ...c,
            timestamp: new Date(c.timestamp),
            comments: c.comments?.map((comment: any) => ({
              ...comment,
              timestamp: new Date(comment.timestamp)
            })) || []
          }));

          // Migrate legacy commits
          const migratedCommits = restoredCommits.map(migrateLegacyCommit);

          // Restore to clientStorage (chunked)
          const CHUNK_SIZE = 10;
          const chunks: Commit[][] = [];
          for (let i = 0; i < migratedCommits.length; i += CHUNK_SIZE) {
            chunks.push(migratedCommits.slice(i, i + CHUNK_SIZE));
          }

          // Save each chunk
          for (let i = 0; i < chunks.length; i++) {
            const serialized = JSON.parse(JSON.stringify(chunks[i]));
            await figma.clientStorage.setAsync(`${COMMIT_CHUNK_PREFIX}${i}`, serialized);
          }

          // Update metadata
          const restoredMeta = {
            ...meta,
            chunkCount: chunks.length,
            lastCommitId: migratedCommits[0]?.id
          };
          await saveChangelogMeta(restoredMeta);

          console.log(`[Storage] ✓ Restored ${migratedCommits.length} commits from backup to clientStorage`);
          commitsCache = { result: migratedCommits, timestamp: Date.now() };
          return migratedCommits;
        }
      }
    } catch (error) {
      console.warn('[Storage] ⚠ Failed to restore from sharedPluginData backup:', error);
      // Non-fatal: return empty array
    }
  }

  commitsCache = { result: commits, timestamp: Date.now() };
  return commits;
}

/**
 * Save a new commit to storage with chunking
 * Stores commits in chunks of up to 10 commits per chunk
 */
async function saveCommit(commit: Commit): Promise<void> {
  // Invalidate cache on write
  commitsCache = null;

  const meta = await getChangelogMeta();
  const commits = await loadCommits();

  // Add new commit to the beginning (most recent first)
  commits.unshift(commit);

  console.log(`[Storage] Saving commit ${commit.id} (version: ${commit.version})`, {
    hasComments: commit.comments && commit.comments.length > 0,
    commentCount: commit.comments?.length || 0
  });

  // Split commits into chunks (10 commits per chunk)
  const CHUNK_SIZE = 10;
  const chunks: Commit[][] = [];

  for (let i = 0; i < commits.length; i += CHUNK_SIZE) {
    chunks.push(commits.slice(i, i + CHUNK_SIZE));
  }

  // Save each chunk with explicit JSON serialization to handle Date objects
  for (let i = 0; i < chunks.length; i++) {
    const serialized = JSON.parse(JSON.stringify(chunks[i]));
    await figma.clientStorage.setAsync(`${COMMIT_CHUNK_PREFIX}${i}`, serialized);
  }

  // Dual-write: Also save to sharedPluginData as backup (survives clientStorage clears)
  try {
    const serializedCommits = JSON.parse(JSON.stringify(commits));
    figma.root.setSharedPluginData(
      SHARED_PLUGIN_NAMESPACE,
      SHARED_PLUGIN_COMMITS_KEY,
      JSON.stringify(serializedCommits)
    );
  } catch (error) {
    console.warn(`[Storage] ⚠ Failed to save backup to sharedPluginData:`, error);
    // Non-fatal: clientStorage save succeeded, so we can continue
  }

  // Verify the commit was saved (read back and validate)
  const savedChunk = await figma.clientStorage.getAsync(`${COMMIT_CHUNK_PREFIX}0`);
  const savedCommit = savedChunk?.[0];
  if (savedCommit && savedCommit.id === commit.id) {
    console.log(`[Storage] ✓ Commit saved successfully with ${savedCommit.comments?.length || 0} comments`);
  } else {
    console.warn(`[Storage] ⚠ Could not verify commit save`);
  }

  // Update metadata
  meta.chunkCount = chunks.length;
  meta.lastCommitId = commit.id;
  await saveChangelogMeta(meta);
}

/**
 * Validate PAT by making a test call to Figma REST API
 */
async function validatePat(pat: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Test the PAT by calling the Figma API to get current user info
    const response = await fetch('https://api.figma.com/v1/me', {
      headers: {
        'X-Figma-Token': pat
      }
    });

    if (response.ok) {
      return { success: true };
    } else if (response.status === 403) {
      return { success: false, error: 'Invalid token. Please check your PAT and try again.' };
    } else {
      return { success: false, error: `Validation failed: ${response.statusText}` };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error. Please try again.'
    };
  }
}

export default function () {
  console.log('[Init] Plugin version: 1.0.4-beta.3');

  // Skip invisible instance children for faster traversals (up to 100x speedup)
  figma.skipInvisibleInstanceChildren = true;

  // Cache file key at init — requires enablePrivatePluginApi in manifest
  cachedFileKey = getFileKey();
  console.log(`[Init] File key: ${cachedFileKey ? cachedFileKey.substring(0, 8) + '...' : 'null'}`);

  // Run one-time migration to backfill existing commits to sharedPluginData
  migrateCommitsToSharedPluginData();

  // Setup histogram interactivity for navigation
  setupHistogramInteractivity();

  // Setup change tracking with documentchange listener.
  // dynamic-page mode requires loadAllPagesAsync before registering documentchange.
  // Run this async so the plugin UI can render immediately while pages load in background.
  (async () => {
    await figma.loadAllPagesAsync();
    figma.on('documentchange', async (event: DocumentChangeEvent) => {
    isChangeTrackingActive = true;
    console.log(`[ChangeTracking] Document changed - ${event.documentChanges.length} changes`);

    for (const change of event.documentChanges) {
      const pageId = await getPageIdForNode(change.id);
      if (!pageId) {
        console.log(`[ChangeTracking] Could not determine page for node ${change.id}`);
        continue;
      }

      const tracker = getPageTracker(pageId);

      if (change.type === 'CREATE') {
        tracker.nodesAdded.add(change.id);
        // Remove from removed set if it was previously deleted and re-added
        tracker.nodesRemoved.delete(change.id);
        console.log(`[ChangeTracking] Node created: ${change.id} on page ${pageId}`);
      } else if (change.type === 'DELETE') {
        tracker.nodesRemoved.add(change.id);
        // Remove from added/modified sets if it was previously tracked
        tracker.nodesAdded.delete(change.id);
        tracker.nodesModified.delete(change.id);
        console.log(`[ChangeTracking] Node deleted: ${change.id} on page ${pageId}`);
      } else if (change.type === 'PROPERTY_CHANGE') {
        // Only track as modified if not already tracked as added
        if (!tracker.nodesAdded.has(change.id)) {
          tracker.nodesModified.add(change.id);
          console.log(`[ChangeTracking] Node modified: ${change.id} on page ${pageId}`);
        }
      }
    }

    // Notify UI that stats have changed
    emit('CHANGE_TRACKED');
  });
  })();

  // Handle PAT status check
  on('CHECK_PAT', async function () {
    const hasToken = await checkPatExists();
    emit('PAT_STATUS', { hasToken });
  });

  // Handle PAT validation and storage
  on('VALIDATE_PAT', async function (data: { pat: string }) {
    const { pat } = data;

    // Validate the PAT
    const validationResult = await validatePat(pat);

    if (validationResult.success) {
      // Store the PAT if validation succeeds
      await storePat(pat);
    }

    emit('PAT_VALIDATION_RESULT', validationResult);
  });

  // Handle PAT removal
  on('REMOVE_PAT', async function () {
    await removePat();
    emit('PAT_REMOVED');
  });

  // Handle versioning mode retrieval
  on('GET_VERSIONING_MODE', async function () {
    const mode = await getVersioningMode();
    emit('VERSIONING_MODE', { mode });
  });

  // Handle versioning mode update
  on('SET_VERSIONING_MODE', async function (data: { mode: 'semantic' | 'date-based' }) {
    await setVersioningMode(data.mode);
    emit('VERSIONING_MODE_SAVED', { mode: data.mode });
  });

  // Handle next version calculation
  on('GET_NEXT_VERSION', async function (data: {
    increment?: VersionIncrement;
    mode?: 'semantic' | 'date-based'
  }) {
    let nextVersion: string;

    if (data.mode === 'date-based') {
      nextVersion = await calculateNextDateVersion();
    } else {
      // Default to semantic with patch increment
      nextVersion = await calculateNextSemanticVersion(data.increment || 'patch');
    }

    emit('NEXT_VERSION', { version: nextVersion });
  });

  // Handle comment fetching
  on('FETCH_COMMENTS', async function () {
    const result = await fetchComments();
    emit('COMMENTS_FETCHED', result);
  });

  // Handle annotation collection
  on('COLLECT_ANNOTATIONS', async function () {
    const annotations = await collectAnnotations();
    emit('ANNOTATIONS_COLLECTED', { annotations });
  });

  // Handle metrics collection
  on('COLLECT_METRICS', function (data: { feedbackCount: number }) {
    const metrics = collectMetrics(data.feedbackCount);
    emit('METRICS_COLLECTED', { metrics });
  });

  // Handle pre-commit stats request
  on('GET_PRE_COMMIT_STATS', async function () {
    try {
      const stats = await getPreCommitStats();
      emit('PRE_COMMIT_STATS', { stats });
    } catch (error) {
      console.error('Error getting pre-commit stats:', error);
      emit('PRE_COMMIT_STATS', {
        stats: {
          newCommentsCount: 0,
          newAnnotationsCount: 0,
          pageChanges: [],
          hasRealTimeTracking: false
        }
      });
    }
  });

  // Handle recent commits retrieval for histogram
  on('GET_RECENT_COMMITS', async function (data: { maxCommits?: number }) {
    try {
      const allCommits = await loadCommits();
      const maxCommits = data.maxCommits || 50;
      const recentCommits = allCommits.slice(0, maxCommits);
      emit('RECENT_COMMITS', { commits: recentCommits });
    } catch (error) {
      console.error('Error loading recent commits:', error);
      emit('RECENT_COMMITS', { commits: [] });
    }
  });

  // Handle navigation to commit from histogram
  on('NAVIGATE_TO_COMMIT', async function (data: { commitId: string }) {
    try {
      const commits = await loadCommits();
      const commit = commits.find(c => c.id === data.commitId);

      if (!commit || !commit.changelogFrameId) {
        figma.notify('Changelog entry not found for this commit');
        return;
      }

      // Find the changelog frame
      const changelogFrame = await figma.getNodeByIdAsync(commit.changelogFrameId);

      // Type guard: ensure it's a SceneNode
      if (!changelogFrame || !('type' in changelogFrame) || changelogFrame.type === 'DOCUMENT') {
        figma.notify('Changelog entry no longer exists');
        return;
      }

      // Navigate to the changelog page
      const { getOrCreateChangelogPage } = await import('./changelog');
      const changelogPage = await getOrCreateChangelogPage();
      await figma.setCurrentPageAsync(changelogPage);

      // Scroll to the frame
      figma.viewport.scrollAndZoomIntoView([changelogFrame as SceneNode]);
      figma.currentPage.selection = [changelogFrame as SceneNode];

      figma.notify(`Navigated to ${commit.version}`);
    } catch (error) {
      console.error('Error navigating to commit:', error);
      figma.notify('Failed to navigate to commit', { error: true });
    }
  });

  // Handle version creation
  once('CREATE_VERSION', async function (data: {
    title: string;
    description?: string;
    versioningMode: 'semantic' | 'date-based';
    incrementType?: VersionIncrement;
  }) {
    const { title, description, versioningMode, incrementType } = data;

    try {
      // Calculate the version
      let version: string;
      if (versioningMode === 'date-based') {
        version = await calculateNextDateVersion();
      } else {
        version = await calculateNextSemanticVersion(incrementType || 'patch');
      }

      // Load previous commits, then run all data collection in parallel
      const existingCommits = await loadCommits();

      // Run independent data collection concurrently
      const [commentsResult, allAnnotations, currentDevStatuses] = await Promise.all([
        fetchComments(),
        collectAnnotations(),
        collectAllDevStatuses()
      ]);

      // Process comments
      const allComments = commentsResult.success ? commentsResult.comments || [] : [];
      if (!commentsResult.success && commentsResult.error) {
        console.log(`[Version] Comments fetch failed: ${commentsResult.error}`);
      }
      const allPreviousComments = existingCommits.flatMap(commit => commit.comments || []);
      const comments = filterNewComments(allComments, allPreviousComments);
      console.log(`[Version] Comments: ${allComments.length} total, ${comments.length} new for version ${version}`);

      // Process annotations
      const allPreviousAnnotations = existingCommits.flatMap(commit => commit.annotations || []);
      const annotations = filterNewAnnotations(allAnnotations, allPreviousAnnotations);
      console.log(`[Version] Annotations: ${allAnnotations.length} total, ${annotations.length} new for version ${version}`);

      // Collect metrics (depends on comments + annotations count)
      const feedbackCount = comments.length + annotations.length;
      const metrics = collectMetrics(feedbackCount);
      console.log(`[Version] Feedback count: ${feedbackCount} (${comments.length} comments, ${annotations.length} annotations)`);

      // Process dev status changes
      const previousSnapshot = existingCommits.length > 0 ? existingCommits[0].devStatusSnapshot : undefined;
      const devStatusChanges = computeDevStatusChanges(currentDevStatuses, previousSnapshot);
      const devStatusSnapshot = Object.fromEntries(
        Object.entries(currentDevStatuses).map(([k, v]) => [k, { status: v.status, pageId: v.pageId, pageName: v.pageName, nodeName: v.nodeName }])
      );
      console.log(`[Version] Dev status changes: ${devStatusChanges.length}`);

      // Create commit object
      const now = new Date();
      console.log(`[Version] Creating new commit at:`, now.toISOString());

      const commit: Commit = {
        id: `commit_${Date.now()}`,
        version,
        title,
        description,
        author: {
          name: figma.currentUser?.name || 'Unknown'
        },
        timestamp: now,
        comments,
        annotations,
        metrics,
        devStatusChanges,
        devStatusSnapshot
      };

      console.log(`[Version] Created commit object with ${comments.length} comments`, {
        commitId: commit.id,
        commentCount: comments.length,
        commentDetails: comments.map(c => ({
          author: c.author.name,
          textPreview: c.text.substring(0, 30),
          timestamp: c.timestamp.toISOString()
        }))
      });

      // Save commit data
      await saveCommit(commit);

      // Save version to Figma history
      // Note: Figma's saveVersionHistoryAsync only accepts a single string,
      // not separate title/description fields like the native UI.
      // We only send the title here - full description is stored in our commit data
      // and will be visible in our changelog rendering
      const versionDescription = `${version} - ${title}`;

      await figma.saveVersionHistoryAsync(versionDescription);

      // Update stored version
      await updateCurrentVersion(version);

      // Render changelog entry (with error handling)
      try {
        const entryFrame = await renderChangelogEntry(commit);

        // Update commit with frame ID and re-save
        commit.changelogFrameId = entryFrame.id;
        await saveCommit(commit);

        // Render/update histogram and trend insights with all commits
        try {
          const allCommits = await loadCommits();
          const { renderHistogramOnChangelogPage, renderTrendInsightsOnChangelogPage } = await import('./changelog');
          await renderHistogramOnChangelogPage(allCommits);
          await renderTrendInsightsOnChangelogPage(allCommits);
        } catch (visualizationError) {
          console.error('Failed to render visualizations:', visualizationError);
          // Don't notify user - visualizations are secondary
        }
      } catch (renderError) {
        // Log error but don't fail the entire commit
        console.error('Failed to render changelog entry:', renderError);
        figma.notify('Version created, but changelog rendering failed', { error: true, timeout: 2000 });
      }

      // Notify UI of success
      emit('VERSION_CREATED', { success: true, version, commit });

      // Reset change tracking after successful commit
      resetChangeTracking();

      figma.notify(`Version ${version} created successfully`);

      // Delay close by 1s to show result
      setTimeout(() => {
        figma.closePlugin();
      }, 1000);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create version';
      emit('VERSION_CREATED', { success: false, error: errorMessage });
      figma.notify(`Error: ${errorMessage}`, { error: true });
    }
  });

  // Handle changelog rebuild
  once('REBUILD_CHANGELOG', async function () {
    try {
      // Load all commits from storage
      const allCommits = await loadCommits();

      if (allCommits.length === 0) {
        figma.notify('No commits found to rebuild', { timeout: 2000 });
        emit('CHANGELOG_REBUILT', { success: false, error: 'No commits found' });
        return;
      }

      // Deduplicate commits by ID (in case of storage corruption)
      const seenIds = new Set<string>();
      const commits: Commit[] = [];
      for (const commit of allCommits) {
        if (!seenIds.has(commit.id)) {
          seenIds.add(commit.id);
          commits.push(commit);
        } else {
          console.warn(`[Rebuild] Found duplicate commit ID: ${commit.id} (${commit.version})`);
        }
      }

      if (commits.length !== allCommits.length) {
        console.log(`[Rebuild] Deduplicated ${allCommits.length} commits to ${commits.length} unique commits`);
      }

      console.log(`[Rebuild] Starting rebuild of ${commits.length} commits`);

      // Notify start
      figma.notify(`Rebuilding changelog with ${commits.length} entries...`, { timeout: 1000 });

      // Rebuild the changelog and get the new frame IDs
      const { rebuildChangelog, renderHistogramOnChangelogPage } = await import('./changelog');
      const frameIdMap = await rebuildChangelog(commits, (current, total) => {
        console.log(`[Rebuild] Progress: ${current}/${total}`);
      });

      // Update each commit with its new changelogFrameId
      const updatedCommits = commits.map(commit => ({
        ...commit,
        changelogFrameId: frameIdMap[commit.id] || commit.changelogFrameId
      }));

      // Re-save all commits with updated frame IDs
      // We need to rebuild the chunks since we're updating all commits
      // Use JSON serialization to ensure dates are stored as ISO strings
      const CHUNK_SIZE = 10;
      const chunks: Commit[][] = [];
      for (let i = 0; i < updatedCommits.length; i += CHUNK_SIZE) {
        chunks.push(updatedCommits.slice(i, i + CHUNK_SIZE));
      }

      // Save each chunk with explicit JSON serialization to handle Date objects
      for (let i = 0; i < chunks.length; i++) {
        const serialized = JSON.parse(JSON.stringify(chunks[i]));
        await figma.clientStorage.setAsync(`${COMMIT_CHUNK_PREFIX}${i}`, serialized);
      }

      // Clean up any orphaned chunks beyond the new chunk count
      const oldMeta = await getChangelogMeta();
      for (let i = chunks.length; i < oldMeta.chunkCount; i++) {
        await figma.clientStorage.deleteAsync(`${COMMIT_CHUNK_PREFIX}${i}`);
        console.log(`[Rebuild] Cleaned up orphaned chunk ${i}`);
      }

      // Update metadata
      const meta = await getChangelogMeta();
      meta.chunkCount = chunks.length;
      await saveChangelogMeta(meta);

      console.log(`[Rebuild] Updated ${Object.keys(frameIdMap).length} commit frame IDs in storage`);

      // Regenerate histogram and trend insights
      try {
        const { renderTrendInsightsOnChangelogPage } = await import('./changelog');
        await renderHistogramOnChangelogPage(updatedCommits);
        await renderTrendInsightsOnChangelogPage(updatedCommits);
        console.log('[Rebuild] Visualizations regenerated successfully');
      } catch (visualizationError) {
        console.error('[Rebuild] Failed to regenerate visualizations:', visualizationError);
        // Don't fail the entire rebuild for visualization errors
      }

      // Notify success
      figma.notify(`Changelog rebuilt successfully with ${commits.length} entries`, { timeout: 3000 });
      emit('CHANGELOG_REBUILT', { success: true, count: commits.length });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to rebuild changelog';
      console.error('[Rebuild] Error:', error);
      figma.notify(`Rebuild failed: ${errorMessage}`, { error: true, timeout: 3000 });
      emit('CHANGELOG_REBUILT', { success: false, error: errorMessage });
    }
  });

  showUI({
    width: 640,
    height: 800
  });
}
