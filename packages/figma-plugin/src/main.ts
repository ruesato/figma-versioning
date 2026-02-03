import { once, on, emit, showUI } from '@create-figma-plugin/utilities';
import { getNextSemanticVersion, getNextDateVersion } from '@figma-versioning/core';
import type { VersionIncrement, Comment, Annotation, CommitMetrics, Commit, ChangelogMeta } from '@figma-versioning/core';
import { renderChangelogEntry } from './changelog';

const PAT_STORAGE_KEY = 'figma_versioning_pat';
const VERSIONING_MODE_KEY = 'figma_versioning_mode';
const CURRENT_VERSION_KEY = 'figma_versioning_current_version';
const CHANGELOG_META_KEY = 'figma_versioning_changelog_meta';
const COMMIT_CHUNK_PREFIX = 'figma_versioning_commit_chunk_';

// Lazy file key getter - try to get it when needed
function getFileKey(): string | null {
  try {
    return figma.fileKey || null;
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
async function fetchComments(since?: Date): Promise<{ success: boolean; comments?: Comment[]; error?: string }> {
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
      author: {
        name: comment.user?.handle || 'Unknown',
        email: comment.user?.email
      },
      timestamp: new Date(comment.created_at),
      text: comment.message,
      nodeId: comment.client_meta?.node_id
    }));

    // Filter to only comments created after the previous version timestamp
    const filtered = since
      ? comments.filter(c => c.timestamp > since)
      : comments;

    console.log(`[Comments] Successfully transformed ${comments.length} comments (${filtered.length} after filtering)`);
    return { success: true, comments: filtered };
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
 * Recursively collect annotations from a node and its children
 */
async function collectAnnotationsFromNode(node: SceneNode, annotations: Annotation[]): Promise<void> {
  // Check if node has annotations
  if ('annotations' in node && Array.isArray(node.annotations)) {
    for (const annotation of node.annotations) {
      // Fetch category label if categoryId exists
      let categoryLabel: string | undefined;
      if (annotation.categoryId) {
        try {
          const category = await figma.annotations.getAnnotationCategoryByIdAsync(annotation.categoryId);
          categoryLabel = category?.label;
        } catch (error) {
          console.error('Error fetching annotation category:', error);
        }
      }

      annotations.push({
        label: annotation.label || '',
        nodeId: node.id,
        isPinned: true, // Annotations in the Plugin API are considered "pinned"
        properties: {
          ...annotation,
          // Add category label if available
          ...(categoryLabel && { category: categoryLabel }),
          // Add node name for display
          nodeName: node.name
        }
      });
    }
  }

  // Recursively process children if the node has them
  if ('children' in node) {
    for (const child of node.children) {
      await collectAnnotationsFromNode(child, annotations);
    }
  }
}

/**
 * Collect all annotations from the current page
 */
async function collectAnnotations(): Promise<Annotation[]> {
  const annotations: Annotation[] = [];
  const currentPage = figma.currentPage;

  // Traverse all nodes on the current page
  for (const node of currentPage.children) {
    await collectAnnotationsFromNode(node, annotations);
  }

  return annotations;
}

/**
 * Generate a fingerprint for an annotation to detect duplicates across versions
 */
function annotationFingerprint(a: Annotation): string {
  const propsStr = a.properties
    ? JSON.stringify(a.properties, Object.keys(a.properties).sort())
    : '';
  return `${a.label}|${a.nodeId}|${propsStr}`;
}

/**
 * Filter annotations to only those that are new or changed compared to the previous version
 */
function filterNewAnnotations(current: Annotation[], previous: Annotation[]): Annotation[] {
  const previousFingerprints = new Set(previous.map(annotationFingerprint));
  return current.filter(a => !previousFingerprints.has(annotationFingerprint(a)));
}

/**
 * Count metrics for a node and its children
 */
function countNodeMetrics(node: SceneNode, metrics: Omit<CommitMetrics, 'feedbackCount' | 'feedbackDelta'>): void {
  // Increment total nodes
  metrics.totalNodes++;

  // Check node type and increment appropriate counter
  if (node.type === 'FRAME') {
    metrics.frames++;
  } else if (node.type === 'COMPONENT' || node.type === 'COMPONENT_SET') {
    metrics.components++;
  } else if (node.type === 'INSTANCE') {
    metrics.instances++;
  } else if (node.type === 'TEXT') {
    metrics.textNodes++;
  }

  // Recursively process children if the node has them
  if ('children' in node) {
    for (const child of node.children) {
      countNodeMetrics(child, metrics);
    }
  }
}

/**
 * Collect node metrics from the current page
 */
function collectMetrics(feedbackCount: number): CommitMetrics {
  const metrics: Omit<CommitMetrics, 'feedbackCount' | 'feedbackDelta'> = {
    totalNodes: 0,
    frames: 0,
    components: 0,
    instances: 0,
    textNodes: 0
  };

  const currentPage = figma.currentPage;

  // Traverse all nodes on the current page
  for (const node of currentPage.children) {
    countNodeMetrics(node, metrics);
  }

  return {
    ...metrics,
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
 * Migrate legacy commit format (message field) to new format (title/description)
 */
function migrateLegacyCommit(commit: any): Commit {
  // If commit already has title field, it's in the new format
  if ('title' in commit) {
    return commit as Commit;
  }

  // Legacy commit with 'message' field - migrate to new format
  // Use message as title, leave description empty
  const { message, ...rest } = commit;
  return {
    ...rest,
    title: message || 'Untitled',
    description: undefined
  } as Commit;
}

/**
 * Load all commits from storage chunks
 */
async function loadCommits(): Promise<Commit[]> {
  const meta = await getChangelogMeta();
  const commits: Commit[] = [];

  for (let i = 0; i < meta.chunkCount; i++) {
    try {
      const chunk = await figma.clientStorage.getAsync(`${COMMIT_CHUNK_PREFIX}${i}`);
      if (chunk && Array.isArray(chunk)) {
        // Migrate legacy commits
        const migratedChunk = chunk.map(migrateLegacyCommit);
        commits.push(...migratedChunk);
      }
    } catch (error) {
      console.error(`Error loading commit chunk ${i}:`, error);
    }
  }

  return commits;
}

/**
 * Save a new commit to storage with chunking
 * Stores commits in chunks of up to 10 commits per chunk
 */
async function saveCommit(commit: Commit): Promise<void> {
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

  // Save each chunk
  for (let i = 0; i < chunks.length; i++) {
    await figma.clientStorage.setAsync(`${COMMIT_CHUNK_PREFIX}${i}`, chunks[i]);
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
      const changelogFrame = figma.getNodeById(commit.changelogFrameId);

      // Type guard: ensure it's a SceneNode
      if (!changelogFrame || !('type' in changelogFrame) || changelogFrame.type === 'DOCUMENT') {
        figma.notify('Changelog entry no longer exists');
        return;
      }

      // Navigate to the changelog page
      const { getOrCreateChangelogPage } = await import('./changelog');
      const changelogPage = getOrCreateChangelogPage();
      figma.currentPage = changelogPage;

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

      // Load previous commit to filter out already-seen comments and annotations
      const existingCommits = await loadCommits();
      const previousCommit = existingCommits.length > 0 ? existingCommits[0] : null;
      const lastVersionTime = previousCommit ? new Date(previousCommit.timestamp) : undefined;

      // Fetch comments (if PAT is available), filtered to only new ones since last version
      const commentsResult = await fetchComments(lastVersionTime);
      const comments = commentsResult.success ? commentsResult.comments || [] : [];
      if (!commentsResult.success && commentsResult.error) {
        console.log(`[Version] Comments fetch failed: ${commentsResult.error}`);
      } else if (comments.length > 0) {
        console.log(`[Version] Successfully fetched ${comments.length} new comments for version ${version}`);
      }

      // Collect annotations, filtered to only new or changed ones since last version
      const allAnnotations = await collectAnnotations();
      const annotations = filterNewAnnotations(allAnnotations, previousCommit?.annotations || []);

      // Collect metrics
      const feedbackCount = comments.length + annotations.length;
      const metrics = collectMetrics(feedbackCount);
      console.log(`[Version] Feedback count: ${feedbackCount} (${comments.length} comments, ${annotations.length} annotations)`);

      // Create commit object
      const commit: Commit = {
        id: `commit_${Date.now()}`,
        version,
        title,
        description,
        author: {
          name: figma.currentUser?.name || 'Unknown'
        },
        timestamp: new Date(),
        comments,
        annotations,
        metrics
      };

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

        // Render/update histogram with all commits
        try {
          const allCommits = await loadCommits();
          const { renderHistogramOnChangelogPage } = await import('./changelog');
          await renderHistogramOnChangelogPage(allCommits);
        } catch (histogramError) {
          console.error('Failed to render histogram:', histogramError);
          // Don't notify user - histogram is secondary
        }
      } catch (renderError) {
        // Log error but don't fail the entire commit
        console.error('Failed to render changelog entry:', renderError);
        figma.notify('Version created, but changelog rendering failed', { error: true, timeout: 2000 });
      }

      // Notify UI of success
      emit('VERSION_CREATED', { success: true, version, commit });

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

  showUI({
    width: 400,
    height: 600
  });
}
