/**
 * Commit Entry Frame Builder
 *
 * Builds nested auto-layout frames for commit entries in the changelog.
 * Frame structure: Header, Message, Comments (conditional), Annotations (conditional)
 */

import type { Commit } from '@figma-versioning/core';
import { detectTheme, getThemeColors } from './theme';

const FRAME_WIDTH = 600;
const PADDING = 16;
const SECTION_SPACING = 12;

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
  text.locked = true;
  return text;
}

/**
 * Create header section with version, author, and timestamp
 */
function createHeaderSection(commit: Commit, colors: ReturnType<typeof getThemeColors>): FrameNode {
  const header = figma.createFrame();
  header.name = 'Header';
  header.layoutMode = 'VERTICAL';
  header.primaryAxisSizingMode = 'FIXED';
  header.counterAxisSizingMode = 'FIXED';
  header.resize(FRAME_WIDTH - PADDING * 2, 50);
  header.itemSpacing = 4;
  header.fills = [];

  // Version text
  const versionText = createText(
    `Version ${commit.version}`,
    16,
    'Bold',
    colors.text
  );
  header.appendChild(versionText);

  // Metadata text (author and timestamp)
  const timestamp = new Date(commit.timestamp).toLocaleString();
  const metaText = createText(
    `${commit.author.name} • ${timestamp}`,
    12,
    'Regular',
    colors.textSecondary
  );
  header.appendChild(metaText);

  header.locked = true;
  return header;
}

/**
 * Create title and description section
 */
function createMessageSection(commit: Commit, colors: ReturnType<typeof getThemeColors>): FrameNode {
  const messageFrame = figma.createFrame();
  messageFrame.name = 'Title and Description';
  messageFrame.layoutMode = 'VERTICAL';
  messageFrame.primaryAxisSizingMode = 'FIXED';
  messageFrame.counterAxisSizingMode = 'AUTO';
  messageFrame.resize(FRAME_WIDTH - PADDING * 2, 20);
  messageFrame.itemSpacing = 8;
  messageFrame.fills = [];

  // Title (prominent)
  const titleText = createText(
    commit.title,
    16,
    'Bold',
    colors.text
  );
  titleText.textAutoResize = 'HEIGHT';
  titleText.resize(FRAME_WIDTH - PADDING * 2, titleText.height);
  messageFrame.appendChild(titleText);

  // Description (if provided)
  if (commit.description) {
    const descriptionText = createText(
      commit.description,
      14,
      'Regular',
      colors.text
    );
    descriptionText.textAutoResize = 'HEIGHT';
    descriptionText.resize(FRAME_WIDTH - PADDING * 2, descriptionText.height);
    messageFrame.appendChild(descriptionText);
  }

  messageFrame.locked = true;
  return messageFrame;
}

/**
 * Create a single comment item frame
 */
function createCommentItem(comment: import('@figma-versioning/core').Comment, colors: ReturnType<typeof getThemeColors>): FrameNode {
  const commentFrame = figma.createFrame();
  commentFrame.name = 'Comment Item';
  commentFrame.layoutMode = 'VERTICAL';
  commentFrame.primaryAxisSizingMode = 'FIXED';
  commentFrame.counterAxisSizingMode = 'AUTO';
  commentFrame.resize(FRAME_WIDTH - PADDING * 2 - 16, 40);
  commentFrame.itemSpacing = 4;
  commentFrame.fills = [];

  // Author and timestamp
  const timestamp = new Date(comment.timestamp).toLocaleString();
  const metaText = createText(
    `${comment.author.name} • ${timestamp}`,
    11,
    'Regular',
    colors.textSecondary
  );
  commentFrame.appendChild(metaText);

  // Comment text
  const commentText = createText(
    comment.text,
    12,
    'Regular',
    colors.text
  );
  commentText.textAutoResize = 'HEIGHT';
  commentText.resize(FRAME_WIDTH - PADDING * 2 - 16, commentText.height);
  commentFrame.appendChild(commentText);

  // Node ID (if available)
  if (comment.nodeId) {
    const nodeIdText = createText(
      `Node: ${comment.nodeId}`,
      10,
      'Regular',
      colors.textSecondary
    );
    commentFrame.appendChild(nodeIdText);
  }

  commentFrame.locked = true;
  return commentFrame;
}

/**
 * Create comments section (conditional)
 */
function createCommentsSection(commit: Commit, colors: ReturnType<typeof getThemeColors>): FrameNode | null {
  if (commit.comments.length === 0) {
    return null;
  }

  const commentsFrame = figma.createFrame();
  commentsFrame.name = 'Comments';
  commentsFrame.layoutMode = 'VERTICAL';
  commentsFrame.primaryAxisSizingMode = 'FIXED';
  commentsFrame.counterAxisSizingMode = 'AUTO';
  commentsFrame.resize(FRAME_WIDTH - PADDING * 2, 20);
  commentsFrame.itemSpacing = 8;
  commentsFrame.fills = [{ type: 'SOLID', color: colors.surface }];
  commentsFrame.paddingTop = 8;
  commentsFrame.paddingBottom = 8;
  commentsFrame.paddingLeft = 8;
  commentsFrame.paddingRight = 8;
  commentsFrame.cornerRadius = 4;

  // Section title
  const titleText = createText(
    `Comments (${commit.comments.length})`,
    12,
    'Medium',
    colors.textSecondary
  );
  commentsFrame.appendChild(titleText);

  // Add individual comment items
  for (const comment of commit.comments) {
    const commentItem = createCommentItem(comment, colors);
    commentsFrame.appendChild(commentItem);
  }

  commentsFrame.locked = true;
  return commentsFrame;
}

/**
 * Create a single annotation item frame
 */
function createAnnotationItem(annotation: import('@figma-versioning/core').Annotation, colors: ReturnType<typeof getThemeColors>): FrameNode {
  const annotationFrame = figma.createFrame();
  annotationFrame.name = 'Annotation Item';
  annotationFrame.layoutMode = 'VERTICAL';
  annotationFrame.primaryAxisSizingMode = 'FIXED';
  annotationFrame.counterAxisSizingMode = 'AUTO';
  annotationFrame.resize(FRAME_WIDTH - PADDING * 2 - 16, 30);
  annotationFrame.itemSpacing = 4;
  annotationFrame.fills = [];

  // Label text
  const labelText = createText(
    annotation.label,
    12,
    'Regular',
    colors.text
  );
  labelText.textAutoResize = 'HEIGHT';
  labelText.resize(FRAME_WIDTH - PADDING * 2 - 16, labelText.height);
  annotationFrame.appendChild(labelText);

  // Node ID reference
  const nodeIdText = createText(
    `Node: ${annotation.nodeId}${annotation.isPinned ? ' (Pinned)' : ''}`,
    10,
    'Regular',
    colors.textSecondary
  );
  annotationFrame.appendChild(nodeIdText);

  annotationFrame.locked = true;
  return annotationFrame;
}

/**
 * Create annotations section (conditional)
 */
function createAnnotationsSection(commit: Commit, colors: ReturnType<typeof getThemeColors>): FrameNode | null {
  if (commit.annotations.length === 0) {
    return null;
  }

  const annotationsFrame = figma.createFrame();
  annotationsFrame.name = 'Annotations';
  annotationsFrame.layoutMode = 'VERTICAL';
  annotationsFrame.primaryAxisSizingMode = 'FIXED';
  annotationsFrame.counterAxisSizingMode = 'AUTO';
  annotationsFrame.resize(FRAME_WIDTH - PADDING * 2, 20);
  annotationsFrame.itemSpacing = 8;
  annotationsFrame.fills = [{ type: 'SOLID', color: colors.surface }];
  annotationsFrame.paddingTop = 8;
  annotationsFrame.paddingBottom = 8;
  annotationsFrame.paddingLeft = 8;
  annotationsFrame.paddingRight = 8;
  annotationsFrame.cornerRadius = 4;

  // Section title
  const titleText = createText(
    `Annotations (${commit.annotations.length})`,
    12,
    'Medium',
    colors.textSecondary
  );
  annotationsFrame.appendChild(titleText);

  // Add individual annotation items
  for (const annotation of commit.annotations) {
    const annotationItem = createAnnotationItem(annotation, colors);
    annotationsFrame.appendChild(annotationItem);
  }

  annotationsFrame.locked = true;
  return annotationsFrame;
}

/**
 * Create a complete commit entry frame with all sections
 *
 * @param commit - The commit data to render
 * @returns A locked frame containing the commit entry
 */
export async function createCommitEntryFrame(commit: Commit): Promise<FrameNode> {
  // Load fonts
  await loadInterFont();

  // Detect theme and get colors
  const theme = detectTheme();
  const colors = getThemeColors(theme);

  // Create main container frame
  const container = figma.createFrame();
  container.name = `Commit: ${commit.version}`;
  container.layoutMode = 'VERTICAL';
  container.primaryAxisSizingMode = 'FIXED';
  container.counterAxisSizingMode = 'AUTO';
  container.resize(FRAME_WIDTH, 100);
  container.itemSpacing = SECTION_SPACING;
  container.paddingTop = PADDING;
  container.paddingBottom = PADDING;
  container.paddingLeft = PADDING;
  container.paddingRight = PADDING;
  container.fills = [{ type: 'SOLID', color: colors.background }];
  container.strokes = [{ type: 'SOLID', color: colors.border }];
  container.strokeWeight = 1;
  container.cornerRadius = 8;

  // Add header section
  const header = createHeaderSection(commit, colors);
  container.appendChild(header);

  // Add message section
  const message = createMessageSection(commit, colors);
  container.appendChild(message);

  // Add comments section (if any)
  const comments = createCommentsSection(commit, colors);
  if (comments) {
    container.appendChild(comments);
  }

  // Add annotations section (if any)
  const annotations = createAnnotationsSection(commit, colors);
  if (annotations) {
    container.appendChild(annotations);
  }

  // Lock the entire frame
  container.locked = true;

  return container;
}
