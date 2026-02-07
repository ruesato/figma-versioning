/**
 * Commit Entry Frame Builder
 *
 * Builds nested auto-layout frames for commit entries in the changelog.
 * Frame structure: Header, Message, Comments (conditional), Annotations (conditional)
 */

import type { Commit } from '@figma-versioning/core';
import { detectTheme, getThemeColors } from './theme';
import { getPropertyLabel } from './property-labels';
import { formatPropertyValue } from './property-formatter';

const FRAME_WIDTH = 600;
const PADDING = 16;
const SECTION_SPACING = 12;
const LABEL_WIDTH = 88; // Width for property labels in columnar layout

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
 * Create header section with gray background containing:
 * - Version row (split "Version" + version number styling)
 * - Author and timestamp
 * - Title (bold)
 * - Description (if provided)
 */
function createHeaderSection(commit: Commit, colors: ReturnType<typeof getThemeColors>): FrameNode {
  const header = figma.createFrame();
  header.name = 'Header';
  header.layoutMode = 'VERTICAL';
  header.primaryAxisSizingMode = 'AUTO';
  header.counterAxisSizingMode = 'AUTO';
  header.resize(FRAME_WIDTH, header.height);
  header.itemSpacing = 8;
  header.paddingTop = PADDING;
  header.paddingBottom = PADDING;
  header.paddingLeft = PADDING;
  header.paddingRight = PADDING;
  header.fills = [{ type: 'SOLID', color: colors.headerBackground }];

  // Version row - split styling for "Version" and version number
  const versionRow = figma.createFrame();
  versionRow.name = 'Version Row';
  versionRow.layoutMode = 'HORIZONTAL';
  versionRow.primaryAxisSizingMode = 'AUTO';
  versionRow.counterAxisSizingMode = 'AUTO';
  versionRow.itemSpacing = 4;
  versionRow.fills = [];

  const versionLabel = createText('Version', 16, 'Regular', colors.textSecondary);
  const versionNumber = createText(commit.version, 16, 'Bold', colors.text);
  versionRow.appendChild(versionLabel);
  versionRow.appendChild(versionNumber);
  versionRow.locked = true;
  header.appendChild(versionRow);

  // Metadata text (author and timestamp)
  const timestamp = new Date(commit.timestamp).toLocaleString();
  const metaText = createText(
    `${commit.author.name} • ${timestamp}`,
    12,
    'Regular',
    colors.textMuted
  );
  header.appendChild(metaText);

  // Title (prominent, bold)
  const titleText = createText(
    commit.title,
    16,
    'Bold',
    colors.text
  );
  titleText.textAutoResize = 'HEIGHT';
  titleText.resize(FRAME_WIDTH - PADDING * 2, titleText.height);
  header.appendChild(titleText);

  // Description (if provided)
  if (commit.description && commit.description.trim().length > 0) {
    const descriptionText = createText(
      commit.description,
      14,
      'Regular',
      colors.textSecondary
    );
    descriptionText.textAutoResize = 'HEIGHT';
    descriptionText.resize(FRAME_WIDTH - PADDING * 2, descriptionText.height);
    header.appendChild(descriptionText);
  }

  header.locked = true;
  return header;
}

// Note: Title and description are now part of createHeaderSection

/**
 * Create a section header with uppercase title and colored badge
 */
function createSectionHeader(
  title: string,
  count: number,
  badgeColor: RGB,
  colors: ReturnType<typeof getThemeColors>
): FrameNode {
  const headerRow = figma.createFrame();
  headerRow.name = 'Section Header';
  headerRow.layoutMode = 'HORIZONTAL';
  headerRow.primaryAxisSizingMode = 'AUTO';
  headerRow.counterAxisSizingMode = 'AUTO';
  headerRow.itemSpacing = 8;
  headerRow.fills = [];
  headerRow.counterAxisAlignItems = 'CENTER';

  // Uppercase title
  const titleText = createText(title.toUpperCase(), 12, 'Medium', colors.textMuted);
  headerRow.appendChild(titleText);

  // Badge with count
  const badge = figma.createFrame();
  badge.name = 'Badge';
  badge.layoutMode = 'HORIZONTAL';
  badge.primaryAxisSizingMode = 'AUTO';
  badge.counterAxisSizingMode = 'AUTO';
  badge.paddingTop = 2;
  badge.paddingBottom = 2;
  badge.paddingLeft = 6;
  badge.paddingRight = 6;
  badge.cornerRadius = 10;
  badge.fills = [{ type: 'SOLID', color: badgeColor }];

  const badgeText = createText(String(count), 10, 'Medium', { r: 1, g: 1, b: 1 });
  badge.appendChild(badgeText);
  badge.locked = true;
  headerRow.appendChild(badge);

  headerRow.locked = true;
  return headerRow;
}

/**
 * Create a single comment item frame
 */
function createCommentItem(
  comment: import('@figma-versioning/core').Comment,
  colors: ReturnType<typeof getThemeColors>,
  parentCommentText?: string
): FrameNode {
  const isReply = !!parentCommentText;
  const commentFrame = figma.createFrame();
  commentFrame.name = isReply ? 'Reply Item' : 'Comment Item';
  commentFrame.layoutMode = 'VERTICAL';
  commentFrame.primaryAxisSizingMode = 'AUTO';
  commentFrame.counterAxisSizingMode = 'FIXED';
  const frameWidth = isReply ? FRAME_WIDTH - PADDING * 2 - 16 : FRAME_WIDTH - PADDING * 2;
  commentFrame.resize(frameWidth, commentFrame.height);
  commentFrame.itemSpacing = 4;
  commentFrame.fills = [];
  if (isReply) {
    commentFrame.paddingLeft = 16;
  }

  // Reply context (if this is a reply)
  if (isReply && parentCommentText) {
    // Truncate parent comment to one line (approximately 60 characters)
    const truncatedParent = parentCommentText.length > 60
      ? parentCommentText.substring(0, 60) + '...'
      : parentCommentText;

    const replyToText = createText(
      `Reply to: "${truncatedParent}"`,
      10,
      'Regular',
      colors.textMuted
    );
    replyToText.textAutoResize = 'HEIGHT';
    replyToText.resize(frameWidth, replyToText.height);
    commentFrame.appendChild(replyToText);
  }

  // Author and timestamp
  const timestamp = new Date(comment.timestamp).toLocaleString();
  const metaText = createText(
    `${comment.author.name} • ${timestamp}`,
    11,
    'Regular',
    colors.textMuted
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
  commentText.resize(frameWidth, commentText.height);
  commentFrame.appendChild(commentText);

  // Node reference with click-to-navigate (if available)
  if (comment.nodeId) {
    const nodeRefText = createText(
      `On layer: ${comment.nodeId}`,
      10,
      'Regular',
      colors.accent
    );
    nodeRefText.textDecoration = 'UNDERLINE';
    nodeRefText.locked = false; // Allow interaction

    // Add hyperlink to navigate to the node
    try {
      nodeRefText.hyperlink = { type: 'NODE', value: comment.nodeId };
    } catch {
      // Node may not exist anymore, fall back to non-interactive style
      nodeRefText.fills = [{ type: 'SOLID', color: colors.textSecondary }];
      nodeRefText.textDecoration = 'NONE';
      nodeRefText.locked = true;
    }

    commentFrame.appendChild(nodeRefText);
  }

  commentFrame.locked = true;
  return commentFrame;
}

/**
 * Create comments section with uppercase header and orange badge
 */
function createCommentsSection(commit: Commit, colors: ReturnType<typeof getThemeColors>): FrameNode | null {
  if (!commit.comments || !Array.isArray(commit.comments) || commit.comments.length === 0) {
    console.log(`[Changelog] No comments for version ${commit.version}`, {
      hasComments: !!commit.comments,
      isArray: Array.isArray(commit.comments),
      length: commit.comments?.length
    });
    return null;
  }

  console.log(`[Changelog] Rendering ${commit.comments.length} comments for version ${commit.version}`, {
    comments: commit.comments.map(c => ({
      id: c.id,
      author: c.author.name,
      textPreview: c.text.substring(0, 30),
      isReply: !!c.parentId
    }))
  });

  const commentsFrame = figma.createFrame();
  commentsFrame.name = 'Comments';
  commentsFrame.layoutMode = 'VERTICAL';
  commentsFrame.primaryAxisSizingMode = 'AUTO';
  commentsFrame.counterAxisSizingMode = 'FIXED';
  commentsFrame.resize(FRAME_WIDTH, commentsFrame.height);
  commentsFrame.itemSpacing = 12;
  commentsFrame.paddingLeft = PADDING;
  commentsFrame.paddingRight = PADDING;
  commentsFrame.fills = [];

  // Section header with badge
  const sectionHeader = createSectionHeader('Comments', commit.comments.length, colors.commentBadge, colors);
  commentsFrame.appendChild(sectionHeader);

  // Organize comments into threads
  // Create a map of comment ID to comment for quick lookup
  const commentMap = new Map<string, import('@figma-versioning/core').Comment>();
  for (const comment of commit.comments) {
    commentMap.set(comment.id, comment);
  }

  // Separate root comments and replies
  const rootComments: import('@figma-versioning/core').Comment[] = [];
  const replies = new Map<string, import('@figma-versioning/core').Comment[]>();

  for (const comment of commit.comments) {
    if (comment.parentId) {
      // This is a reply
      const repliesArray = replies.get(comment.parentId) || [];
      repliesArray.push(comment);
      replies.set(comment.parentId, repliesArray);
    } else {
      // This is a root comment
      rootComments.push(comment);
    }
  }

  // Render root comments followed by their replies
  for (const rootComment of rootComments) {
    // Render root comment
    const commentItem = createCommentItem(rootComment, colors);
    commentsFrame.appendChild(commentItem);

    // Render replies to this root comment
    const commentReplies = replies.get(rootComment.id) || [];
    for (const reply of commentReplies) {
      const replyItem = createCommentItem(reply, colors, rootComment.text);
      commentsFrame.appendChild(replyItem);
    }
  }

  commentsFrame.locked = true;
  return commentsFrame;
}

/**
 * Create a property row with columnar layout (fixed-width label, flexible value)
 */
function createPropertyRow(
  label: string,
  value: string,
  colors: ReturnType<typeof getThemeColors>,
  width: number = FRAME_WIDTH - PADDING * 2
): FrameNode {
  const row = figma.createFrame();
  row.name = 'Property Row';
  row.layoutMode = 'HORIZONTAL';
  row.primaryAxisSizingMode = 'FIXED';
  row.counterAxisSizingMode = 'AUTO';
  row.resize(width, row.height);
  row.itemSpacing = 8;
  row.fills = [];

  // Label with fixed width
  const labelText = createText(label, 11, 'Regular', colors.textMuted);
  labelText.resize(LABEL_WIDTH, labelText.height);
  labelText.textTruncation = 'ENDING';
  row.appendChild(labelText);

  // Value with flexible width
  const valueText = createText(value, 11, 'Regular', colors.text);
  valueText.textAutoResize = 'HEIGHT';
  valueText.layoutGrow = 1;
  row.appendChild(valueText);

  row.locked = true;
  return row;
}

/**
 * Create a single annotation item frame with columnar property layout
 *
 * Renders an annotation with:
 * - Header row with label and optional pin icon
 * - Layer reference
 * - Properties in columnar layout (88px label, flexible value)
 *
 * Only displays properties that have values (non-null, non-undefined)
 */
function createAnnotationItem(annotation: import('@figma-versioning/core').Annotation, colors: ReturnType<typeof getThemeColors>): FrameNode {
  const annotationFrame = figma.createFrame();
  annotationFrame.name = 'Annotation Item';
  annotationFrame.layoutMode = 'VERTICAL';
  annotationFrame.primaryAxisSizingMode = 'AUTO';
  annotationFrame.counterAxisSizingMode = 'FIXED';
  annotationFrame.resize(FRAME_WIDTH - PADDING * 2, annotationFrame.height);
  annotationFrame.itemSpacing = 6;
  annotationFrame.fills = [];

  // Header row with label and pin icon
  const headerRow = figma.createFrame();
  headerRow.name = 'Annotation Header';
  headerRow.layoutMode = 'HORIZONTAL';
  headerRow.primaryAxisSizingMode = 'AUTO';
  headerRow.counterAxisSizingMode = 'AUTO';
  headerRow.itemSpacing = 6;
  headerRow.fills = [];
  headerRow.counterAxisAlignItems = 'CENTER';

  // Pin icon for pinned items
  if (annotation.isPinned) {
    const pinIcon = createText('📌', 12, 'Regular', colors.text);
    headerRow.appendChild(pinIcon);
  }

  // Label text - use labelMarkdown if available in properties, otherwise use label
  const labelContent = (annotation.properties?.labelMarkdown as string) || annotation.label;
  const labelText = createText(labelContent, 12, 'Medium', colors.text);
  labelText.textAutoResize = 'WIDTH_AND_HEIGHT';
  headerRow.appendChild(labelText);

  headerRow.locked = true;
  annotationFrame.appendChild(headerRow);

  // Layer reference with click-to-navigate
  const nodeName = annotation.properties?.nodeName as string | undefined;
  const nodeDisplayText = nodeName || annotation.nodeId;
  const nodeRefText = createText(
    `Layer: ${nodeDisplayText}`,
    10,
    'Regular',
    colors.accent
  );
  nodeRefText.textDecoration = 'UNDERLINE';
  nodeRefText.locked = false; // Allow interaction

  // Add hyperlink to navigate to the node
  try {
    nodeRefText.hyperlink = { type: 'NODE', value: annotation.nodeId };
  } catch {
    // Node may not exist anymore, fall back to non-interactive style
    nodeRefText.fills = [{ type: 'SOLID', color: colors.textSecondary }];
    nodeRefText.textDecoration = 'NONE';
    nodeRefText.locked = true;
  }

  annotationFrame.appendChild(nodeRefText);

  // Display annotation properties in columnar layout (only if they have values)
  if (annotation.properties && Object.keys(annotation.properties).length > 0) {
    const annotationProps = annotation.properties;

    // Check if there's a nested 'properties' array (actual pinned properties from Figma)
    const pinnedProperties = annotationProps.properties as Array<{ type: string; [key: string]: unknown }> | undefined;

    if (Array.isArray(pinnedProperties) && pinnedProperties.length > 0) {
      // Display properties from the pinned properties array
      for (const prop of pinnedProperties) {
        if (!prop || !prop.type) continue;

        const propertyName = prop.type;
        const propertyValue = 'value' in prop ? prop.value : prop;

        // Skip null/undefined values
        if (propertyValue === null || propertyValue === undefined) continue;

        const label = getPropertyLabel(propertyName);
        const formattedValue = formatPropertyValue(propertyValue, propertyName);

        // Skip empty formatted values
        if (!formattedValue || formattedValue.trim() === '') continue;

        const propertyRow = createPropertyRow(label, formattedValue, colors);
        annotationFrame.appendChild(propertyRow);
      }
    } else {
      // Fallback: display top-level properties (skip metadata fields)
      for (const [propertyName, propertyValue] of Object.entries(annotationProps)) {
        // Skip invalid or empty properties
        if (propertyValue === null || propertyValue === undefined) continue;

        // Skip properties that are metadata or already displayed
        if (propertyName === 'labelMarkdown' || propertyName === 'label' ||
            propertyName === 'properties' || propertyName === 'nodeId' ||
            propertyName === 'isPinned' || propertyName === 'categoryId' ||
            propertyName === 'nodeName' || propertyName === 'category') {
          continue;
        }

        const label = getPropertyLabel(propertyName);
        const formattedValue = formatPropertyValue(propertyValue, propertyName);

        // Skip empty formatted values
        if (!formattedValue || formattedValue.trim() === '') continue;

        const propertyRow = createPropertyRow(label, formattedValue, colors);
        annotationFrame.appendChild(propertyRow);
      }
    }
  }

  annotationFrame.locked = true;
  return annotationFrame;
}

/**
 * Create annotations section with uppercase header and blue badge
 */
function createAnnotationsSection(commit: Commit, colors: ReturnType<typeof getThemeColors>): FrameNode | null {
  if (commit.annotations.length === 0) {
    return null;
  }

  const annotationsFrame = figma.createFrame();
  annotationsFrame.name = 'Annotations';
  annotationsFrame.layoutMode = 'VERTICAL';
  annotationsFrame.primaryAxisSizingMode = 'AUTO';
  annotationsFrame.counterAxisSizingMode = 'FIXED';
  annotationsFrame.resize(FRAME_WIDTH, annotationsFrame.height);
  annotationsFrame.itemSpacing = 12;
  annotationsFrame.paddingLeft = PADDING;
  annotationsFrame.paddingRight = PADDING;
  annotationsFrame.fills = [];

  // Section header with badge
  const sectionHeader = createSectionHeader('Annotations', commit.annotations.length, colors.annotationBadge, colors);
  annotationsFrame.appendChild(sectionHeader);

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
  console.log(`[Changelog] Creating commit entry frame for version ${commit.version}`, {
    hasComments: commit.comments && commit.comments.length > 0,
    commentCount: commit.comments?.length || 0,
    hasAnnotations: commit.annotations && commit.annotations.length > 0,
    annotationCount: commit.annotations?.length || 0
  });

  // Load fonts
  await loadInterFont();

  // Detect theme and get colors
  const theme = detectTheme();
  const colors = getThemeColors(theme);

  // Create main container frame
  const container = figma.createFrame();
  container.name = `Commit: ${commit.version}`;
  container.layoutMode = 'VERTICAL';
  container.primaryAxisSizingMode = 'AUTO';
  container.counterAxisSizingMode = 'AUTO';
  container.resize(FRAME_WIDTH, container.height);
  container.itemSpacing = SECTION_SPACING;
  container.paddingBottom = PADDING;
  container.fills = [{ type: 'SOLID', color: colors.background }];
  container.strokes = [{ type: 'SOLID', color: colors.border }];
  container.strokeWeight = 1;
  container.cornerRadius = 8;
  container.clipsContent = true;

  // Add header section (includes version, author, timestamp, title, description)
  const header = createHeaderSection(commit, colors);
  container.appendChild(header);

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
