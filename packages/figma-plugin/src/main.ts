import { once, on, emit, showUI } from '@create-figma-plugin/utilities';
import { getNextSemanticVersion, getNextDateVersion } from '@figma-versioning/core';
import type { VersionIncrement, Comment, Annotation, CommitMetrics } from '@figma-versioning/core';

const PAT_STORAGE_KEY = 'figma_versioning_pat';
const VERSIONING_MODE_KEY = 'figma_versioning_mode';
const CURRENT_VERSION_KEY = 'figma_versioning_current_version';

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
      return { success: false, error: 'No Personal Access Token found. Please configure it in settings.' };
    }

    // Get the current file key
    const fileKey = figma.fileKey;
    if (!fileKey) {
      return { success: false, error: 'Unable to determine current file.' };
    }

    // Fetch comments from Figma API
    const response = await fetch(`https://api.figma.com/v1/files/${fileKey}/comments`, {
      headers: {
        'X-Figma-Token': pat
      }
    });

    if (!response.ok) {
      if (response.status === 403) {
        return { success: false, error: 'Invalid or expired token. Please update your PAT in settings.' };
      }
      return { success: false, error: `API error: ${response.statusText}` };
    }

    const data = await response.json();

    // Transform Figma comments to our format
    const comments: Comment[] = (data.comments || []).map((comment: any) => ({
      author: {
        name: comment.user?.handle || 'Unknown',
        email: comment.user?.email
      },
      timestamp: new Date(comment.created_at),
      text: comment.message,
      nodeId: comment.client_meta?.node_id
    }));

    return { success: true, comments };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch comments'
    };
  }
}

/**
 * Recursively collect annotations from a node and its children
 */
function collectAnnotationsFromNode(node: SceneNode, annotations: Annotation[]): void {
  // Check if node has annotations
  if ('annotations' in node && Array.isArray(node.annotations)) {
    for (const annotation of node.annotations) {
      annotations.push({
        label: annotation.label || '',
        nodeId: node.id,
        isPinned: true, // Annotations in the Plugin API are considered "pinned"
        properties: {
          ...annotation
        }
      });
    }
  }

  // Recursively process children if the node has them
  if ('children' in node) {
    for (const child of node.children) {
      collectAnnotationsFromNode(child, annotations);
    }
  }
}

/**
 * Collect all annotations from the current page
 */
function collectAnnotations(): Annotation[] {
  const annotations: Annotation[] = [];
  const currentPage = figma.currentPage;

  // Traverse all nodes on the current page
  for (const node of currentPage.children) {
    collectAnnotationsFromNode(node, annotations);
  }

  return annotations;
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
  on('COLLECT_ANNOTATIONS', function () {
    const annotations = collectAnnotations();
    emit('ANNOTATIONS_COLLECTED', { annotations });
  });

  // Handle metrics collection
  on('COLLECT_METRICS', function (data: { feedbackCount: number }) {
    const metrics = collectMetrics(data.feedbackCount);
    emit('METRICS_COLLECTED', { metrics });
  });

  // Handle version creation
  once('CREATE_VERSION', async function (data: {
    message: string;
    versioningMode: 'semantic' | 'date-based';
    incrementType?: VersionIncrement;
  }) {
    const { message, versioningMode, incrementType } = data;

    try {
      // Calculate the version
      let version: string;
      if (versioningMode === 'date-based') {
        version = await calculateNextDateVersion();
      } else {
        version = await calculateNextSemanticVersion(incrementType || 'patch');
      }

      // Create version description with version number and message
      const description = `${version} - ${message}`;

      // Save version to Figma history
      await figma.saveVersionHistoryAsync(description);

      // Update stored version
      await updateCurrentVersion(version);

      // Notify UI of success
      emit('VERSION_CREATED', { success: true, version });

      figma.notify(`Version ${version} created successfully`);
      figma.closePlugin();
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
