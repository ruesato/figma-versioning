/**
 * Commit Entry Frame Builder
 *
 * Builds nested auto-layout frames for commit entries in the changelog.
 * Frame structure: Header, Message, Comments (conditional), Annotations (conditional)
 */

import type { Commit, DevStatusChange, LayerDevStatus } from '@figma-versioning/core';
import { detectTheme, getThemeColors } from './theme';
import { getPropertyLabel } from './property-labels';
import { formatPropertyValue } from './property-formatter';

const FRAME_WIDTH = 600;
const PADDING = 24; // Section padding on all sides
const SECTION_SPACING = 12; // Gap within sections
const HEADER_PADDING_TOP = 32;
const HEADER_PADDING_BOTTOM = 12;
const ITEM_SPACING = 8; // Gap between section items
const LABEL_WIDTH = 88; // Width for property labels in columnar layout
const ITEM_BOTTOM_PADDING = 16; // Bottom padding for comment/annotation items
const CARD_PADDING = 16;
const CARD_BORDER_RADIUS = 8;
const CARD_BORDER_COLOR = { r: 0.902, g: 0.902, b: 0.902 }; // #e6e6e6
const SECTION_DIVIDER_COLOR = { r: 0.878, g: 0.878, b: 0.878 }; // #e0e0e0

/**
 * Load Inter font for text rendering
 */
async function loadInterFont(): Promise<void> {
  await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
  await figma.loadFontAsync({ family: 'Inter', style: 'Medium' });
  await figma.loadFontAsync({ family: 'Inter', style: 'Bold' });
}

/**
 * Create a section divider line (1px top border)
 */
function createSectionDivider(): FrameNode {
  const divider = figma.createFrame();
  divider.name = 'Section Divider';
  divider.layoutMode = 'HORIZONTAL';
  divider.primaryAxisSizingMode = 'FIXED';
  divider.counterAxisSizingMode = 'FIXED';
  divider.resize(FRAME_WIDTH, 1);
  divider.fills = [{ type: 'SOLID', color: SECTION_DIVIDER_COLOR }];
  divider.locked = true;
  return divider;
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
  header.itemSpacing = ITEM_SPACING;
  header.paddingTop = HEADER_PADDING_TOP;
  header.paddingBottom = HEADER_PADDING_BOTTOM;
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
  const titleText = createText(title.toUpperCase(), 16, 'Bold', colors.textSecondary);
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
 * Create a single page change entry with name and change statistics
 */
function createPageEntry(
  pageName: string,
  added: number,
  modified: number,
  colors: ReturnType<typeof getThemeColors>
): FrameNode {
  const entry = figma.createFrame();
  entry.name = 'Page Entry';
  entry.layoutMode = 'VERTICAL';
  entry.primaryAxisSizingMode = 'AUTO';
  entry.counterAxisSizingMode = 'FIXED';
  entry.resize(FRAME_WIDTH - PADDING * 2 - CARD_PADDING * 2, entry.height);
  entry.itemSpacing = 4;
  entry.fills = [];

  // Page name (bold, prominent)
  const pageNameText = createText(pageName, 12, 'Medium', colors.text);
  entry.appendChild(pageNameText);

  // Stats line: "+{added} added • {modified} modified • Net change: +{net}"
  const net = added - modified;
  const statsFrame = figma.createFrame();
  statsFrame.name = 'Stats Line';
  statsFrame.layoutMode = 'HORIZONTAL';
  statsFrame.primaryAxisSizingMode = 'AUTO';
  statsFrame.counterAxisSizingMode = 'AUTO';
  statsFrame.itemSpacing = 4;
  statsFrame.fills = [];

  // Added count
  const addedText = createText(`+${added} added`, 11, 'Regular', colors.textSecondary);
  statsFrame.appendChild(addedText);

  // Separator and modified count
  const separatorText = createText('•', 11, 'Regular', colors.textSecondary);
  statsFrame.appendChild(separatorText);

  const modifiedText = createText(`${modified} modified`, 11, 'Regular', colors.textSecondary);
  statsFrame.appendChild(modifiedText);

  // Net change line
  const netSeparator = createText('•', 11, 'Regular', colors.textSecondary);
  statsFrame.appendChild(netSeparator);

  const netLabel = createText('Net change:', 11, 'Regular', colors.textSecondary);
  statsFrame.appendChild(netLabel);

  const netValue = createText(`+${net}`, 11, 'Medium', { r: 0, g: 0.478, b: 0.145 }); // #007a25 green
  statsFrame.appendChild(netValue);

  statsFrame.locked = true;
  entry.appendChild(statsFrame);

  entry.locked = true;
  return entry;
}

/**
 * Create pages changed section with card-style layout
 */
async function createPagesChangedSection(
  commit: Commit,
  colors: ReturnType<typeof getThemeColors>,
  pageStats?: import('@figma-versioning/core').PageChangeStats[]
): Promise<FrameNode | null> {
  // Only show if there are page changes to display
  if (!pageStats || pageStats.length === 0) {
    return null;
  }

  const sectionFrame = figma.createFrame();
  sectionFrame.name = 'Pages Changed';
  sectionFrame.layoutMode = 'VERTICAL';
  sectionFrame.primaryAxisSizingMode = 'AUTO';
  sectionFrame.counterAxisSizingMode = 'FIXED';
  sectionFrame.resize(FRAME_WIDTH, sectionFrame.height);
  sectionFrame.itemSpacing = ITEM_SPACING;
  sectionFrame.paddingTop = PADDING;
  sectionFrame.paddingBottom = PADDING;
  sectionFrame.paddingLeft = PADDING;
  sectionFrame.paddingRight = PADDING;
  sectionFrame.fills = [];

  // Add top divider
  const divider = createSectionDivider();
  sectionFrame.appendChild(divider);

  // Section header with badge
  const sectionHeader = createSectionHeader('Pages Changed', pageStats.length, colors.pagesChangedBadge, colors);
  sectionFrame.appendChild(sectionHeader);

  // Card container for page entries
  const card = figma.createFrame();
  card.name = 'Pages Changed Card';
  card.layoutMode = 'VERTICAL';
  card.primaryAxisSizingMode = 'AUTO';
  card.counterAxisSizingMode = 'FIXED';
  card.resize(FRAME_WIDTH - PADDING * 2, card.height);
  card.itemSpacing = 12;
  card.paddingTop = CARD_PADDING;
  card.paddingBottom = CARD_PADDING;
  card.paddingLeft = CARD_PADDING;
  card.paddingRight = CARD_PADDING;
  card.cornerRadius = CARD_BORDER_RADIUS;
  card.fills = [{ type: 'SOLID', color: colors.headerBackground }];

  // Add page entries
  for (const pageChange of pageStats) {
    const entry = createPageEntry(
      pageChange.pageName,
      pageChange.nodesAdded,
      pageChange.nodesModified,
      colors
    );
    card.appendChild(entry);
  }

  card.locked = true;
  sectionFrame.appendChild(card);

  sectionFrame.locked = true;
  return sectionFrame;
}

/**
 * Create a single comment item frame
 */
async function createCommentItem(
  comment: import('@figma-versioning/core').Comment,
  colors: ReturnType<typeof getThemeColors>,
  parentCommentText?: string
): Promise<FrameNode> {
  const isReply = !!parentCommentText;
  const commentFrame = figma.createFrame();
  commentFrame.name = isReply ? 'Reply Item' : 'Comment Item';
  commentFrame.layoutMode = 'VERTICAL';
  commentFrame.primaryAxisSizingMode = 'AUTO';
  commentFrame.counterAxisSizingMode = 'FIXED';
  const frameWidth = isReply ? FRAME_WIDTH - PADDING * 2 - 16 : FRAME_WIDTH - PADDING * 2;
  commentFrame.resize(frameWidth, commentFrame.height);
  commentFrame.itemSpacing = SECTION_SPACING;
  commentFrame.paddingBottom = ITEM_BOTTOM_PADDING;
  commentFrame.fills = [];
  if (isReply) {
    commentFrame.paddingLeft = 16;
  }

  // Reply context (if this is a reply)
  if (isReply && parentCommentText) {
    const replyToText = createText(
      `Reply to: ${parentCommentText}`,
      10,
      'Regular',
      colors.textSecondary
    );
    replyToText.resize(frameWidth, replyToText.height);
    replyToText.textTruncation = 'ENDING'; // Truncate with ellipsis at end
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
    'Medium',
    colors.text
  );
  commentText.textAutoResize = 'HEIGHT';
  commentText.resize(frameWidth, commentText.height);
  commentFrame.appendChild(commentText);

  // Node reference with click-to-navigate (if available)
  if (comment.nodeId) {
    // Try to get the node name for better UX
    let nodeDisplayName = comment.nodeId; // Fallback to ID
    let nodeExists = true;

    try {
      const node = await figma.getNodeByIdAsync(comment.nodeId);
      if (node && 'name' in node) {
        nodeDisplayName = node.name;
      }
    } catch {
      // Node may not exist anymore
      nodeExists = false;
      nodeDisplayName = 'Deleted layer';
    }

    const nodeRefText = createText(
      `On layer: ${nodeDisplayName}`,
      10,
      'Regular',
      nodeExists ? colors.accent : colors.textSecondary
    );
    nodeRefText.textDecoration = nodeExists ? 'UNDERLINE' : 'NONE';
    nodeRefText.locked = !nodeExists; // Allow interaction only if node exists

    // Add hyperlink to navigate to the node (if it exists)
    if (nodeExists) {
      try {
        nodeRefText.hyperlink = { type: 'NODE', value: comment.nodeId };
      } catch {
        // Hyperlink failed, update styling to non-interactive
        nodeRefText.fills = [{ type: 'SOLID', color: colors.textSecondary }];
        nodeRefText.textDecoration = 'NONE';
        nodeRefText.locked = true;
      }
    }

    commentFrame.appendChild(nodeRefText);
  }

  commentFrame.locked = true;
  return commentFrame;
}

/**
 * Create comments section with uppercase header and orange badge
 */
async function createCommentsSection(commit: Commit, colors: ReturnType<typeof getThemeColors>): Promise<FrameNode | null> {
  if (!commit.comments || !Array.isArray(commit.comments) || commit.comments.length === 0) {
    return null;
  }

  const commentsFrame = figma.createFrame();
  commentsFrame.name = 'Comments';
  commentsFrame.layoutMode = 'VERTICAL';
  commentsFrame.primaryAxisSizingMode = 'AUTO';
  commentsFrame.counterAxisSizingMode = 'FIXED';
  commentsFrame.resize(FRAME_WIDTH, commentsFrame.height);
  commentsFrame.itemSpacing = ITEM_SPACING;
  commentsFrame.paddingTop = PADDING;
  commentsFrame.paddingBottom = PADDING;
  commentsFrame.paddingLeft = PADDING;
  commentsFrame.paddingRight = PADDING;
  commentsFrame.fills = [];

  // Add top divider
  const divider = createSectionDivider();
  commentsFrame.appendChild(divider);

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
    const commentItem = await createCommentItem(rootComment, colors);
    commentsFrame.appendChild(commentItem);

    // Render replies to this root comment
    const commentReplies = replies.get(rootComment.id) || [];
    for (const reply of commentReplies) {
      const replyItem = await createCommentItem(reply, colors, rootComment.text);
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
async function createAnnotationItem(annotation: import('@figma-versioning/core').Annotation, colors: ReturnType<typeof getThemeColors>): Promise<FrameNode> {
  const annotationFrame = figma.createFrame();
  annotationFrame.name = 'Annotation Item';
  annotationFrame.layoutMode = 'VERTICAL';
  annotationFrame.primaryAxisSizingMode = 'AUTO';
  annotationFrame.counterAxisSizingMode = 'FIXED';
  annotationFrame.resize(FRAME_WIDTH - PADDING * 2, annotationFrame.height);
  annotationFrame.itemSpacing = SECTION_SPACING;
  annotationFrame.paddingBottom = ITEM_BOTTOM_PADDING;
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
      // Get the actual node to read property values
      let node: SceneNode | null = null;
      try {
        node = await figma.getNodeByIdAsync(annotation.nodeId) as SceneNode;
      } catch (error) {
        console.warn(`[Annotation] Could not find node ${annotation.nodeId}`, error);
      }

      // Display properties from the pinned properties array
      for (const prop of pinnedProperties) {
        if (!prop || !prop.type) continue;

        const propertyName = prop.type;

        // Read the actual property value from the node
        // AnnotationProperty only has 'type', not the value - we must read from the node
        let propertyValue: unknown = null;
        if (node && propertyName in node) {
          propertyValue = (node as any)[propertyName];
        }

        // Skip null/undefined values
        if (propertyValue === null || propertyValue === undefined) {
          continue;
        }

        const label = getPropertyLabel(propertyName);
        const formattedValue = formatPropertyValue(propertyValue, propertyName);

        // Skip empty formatted values
        if (!formattedValue || formattedValue.trim() === '') continue;

        const propertyRow = createPropertyRow(label, formattedValue, colors);
        annotationFrame.appendChild(propertyRow);
      }

      // Display category if present (not a node property, stored in annotation metadata)
      if (annotationProps.category && typeof annotationProps.category === 'string') {
        const categoryRow = createPropertyRow('Category', annotationProps.category, colors);
        annotationFrame.appendChild(categoryRow);
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
            propertyName === 'nodeName') {
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
async function createAnnotationsSection(commit: Commit, colors: ReturnType<typeof getThemeColors>): Promise<FrameNode | null> {
  if (commit.annotations.length === 0) {
    return null;
  }

  const annotationsFrame = figma.createFrame();
  annotationsFrame.name = 'Annotations';
  annotationsFrame.layoutMode = 'VERTICAL';
  annotationsFrame.primaryAxisSizingMode = 'AUTO';
  annotationsFrame.counterAxisSizingMode = 'FIXED';
  annotationsFrame.resize(FRAME_WIDTH, annotationsFrame.height);
  annotationsFrame.itemSpacing = ITEM_SPACING;
  annotationsFrame.paddingTop = PADDING;
  annotationsFrame.paddingBottom = PADDING;
  annotationsFrame.paddingLeft = PADDING;
  annotationsFrame.paddingRight = PADDING;
  annotationsFrame.fills = [];

  // Add top divider
  const divider = createSectionDivider();
  annotationsFrame.appendChild(divider);

  // Section header with badge
  const sectionHeader = createSectionHeader('Annotations', commit.annotations.length, colors.annotationBadge, colors);
  annotationsFrame.appendChild(sectionHeader);

  // Add individual annotation items
  for (const annotation of commit.annotations) {
    const annotationItem = await createAnnotationItem(annotation, colors);
    annotationsFrame.appendChild(annotationItem);
  }

  annotationsFrame.locked = true;
  return annotationsFrame;
}

/**
 * Get a human-readable label for a dev status change
 */
function formatDevStatusChange(previousStatus: LayerDevStatus | null, newStatus: LayerDevStatus | null): string {
  if (newStatus === 'READY_FOR_DEV') {
    return 'Ready for Dev';
  }
  if (newStatus === 'COMPLETED') {
    return 'Completed';
  }
  if (previousStatus === 'READY_FOR_DEV') {
    return 'Removed from Ready for Dev';
  }
  if (previousStatus === 'COMPLETED') {
    return 'Removed from Completed';
  }
  return 'Status changed';
}

/**
 * Get the indicator color for a dev status change
 */
function getDevStatusColor(change: DevStatusChange, colors: ReturnType<typeof getThemeColors>): RGB {
  if (change.newStatus === 'READY_FOR_DEV' || change.newStatus === 'COMPLETED') {
    return colors.devStatusBadge;
  }
  // Removed status — use muted color
  return colors.textMuted;
}

/**
 * Create the dev status changes section
 */
function createDevStatusSection(commit: Commit, colors: ReturnType<typeof getThemeColors>): FrameNode | null {
  if (!commit.devStatusChanges || commit.devStatusChanges.length === 0) {
    return null;
  }

  const section = figma.createFrame();
  section.name = 'Dev Status';
  section.layoutMode = 'VERTICAL';
  section.primaryAxisSizingMode = 'AUTO';
  section.counterAxisSizingMode = 'FIXED';
  section.resize(FRAME_WIDTH, section.height);
  section.itemSpacing = ITEM_SPACING;
  section.paddingTop = PADDING;
  section.paddingBottom = PADDING;
  section.paddingLeft = PADDING;
  section.paddingRight = PADDING;
  section.fills = [];

  // Add top divider
  const divider = createSectionDivider();
  section.appendChild(divider);

  // Section header with green badge
  const sectionHeader = createSectionHeader('Dev Status', commit.devStatusChanges.length, colors.devStatusBadge, colors);
  section.appendChild(sectionHeader);

  // One row per change: "• [pageName] / [layerName]: [statusChange]"
  for (const change of commit.devStatusChanges) {
    const statusLabel = formatDevStatusChange(change.previousStatus, change.newStatus);
    const indicatorColor = getDevStatusColor(change, colors);

    const row = figma.createFrame();
    row.name = 'Dev Status Change';
    row.layoutMode = 'HORIZONTAL';
    row.primaryAxisSizingMode = 'FIXED';
    row.counterAxisSizingMode = 'AUTO';
    row.resize(FRAME_WIDTH - PADDING * 2, row.height);
    row.itemSpacing = 6;
    row.fills = [];
    row.counterAxisAlignItems = 'CENTER';

    // Colored bullet
    const bullet = createText('•', 12, 'Bold', indicatorColor);
    row.appendChild(bullet);

    // "[pageName] / [layerName]: [statusLabel]"
    const rowText = createText(
      `${change.pageName} / ${change.layerName}: ${statusLabel}`,
      12,
      'Regular',
      colors.text
    );
    rowText.textAutoResize = 'HEIGHT';
    rowText.layoutGrow = 1;

    // Link to the layer if it still exists
    try {
      rowText.hyperlink = { type: 'NODE', value: change.nodeId };
      rowText.textDecoration = 'NONE';
    } catch {
      // Node may no longer exist — no hyperlink
    }

    row.appendChild(rowText);
    row.locked = true;
    section.appendChild(row);
  }

  section.locked = true;
  return section;
}

/**
 * Create a complete commit entry frame with all sections
 *
 * @param commit - The commit data to render
 * @param pageStats - Optional page change statistics to display
 * @returns A locked frame containing the commit entry
 */
export async function createCommitEntryFrame(commit: Commit, pageStats?: import('@figma-versioning/core').PageChangeStats[]): Promise<FrameNode> {
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
  container.paddingBottom = HEADER_PADDING_BOTTOM;
  container.fills = [{ type: 'SOLID', color: colors.background }];
  container.strokes = [{ type: 'SOLID', color: CARD_BORDER_COLOR }];
  container.strokeWeight = 1;
  container.cornerRadius = CARD_BORDER_RADIUS;
  container.clipsContent = true;

  // Add header section (includes version, author, timestamp, title, description)
  const header = createHeaderSection(commit, colors);
  container.appendChild(header);

  // Add pages changed section (if any)
  const pagesChanged = await createPagesChangedSection(commit, colors, pageStats);
  if (pagesChanged) {
    container.appendChild(pagesChanged);
  }

  // Add comments section (if any)
  const comments = await createCommentsSection(commit, colors);
  if (comments) {
    container.appendChild(comments);
  }

  // Add annotations section (if any)
  const annotations = await createAnnotationsSection(commit, colors);
  if (annotations) {
    container.appendChild(annotations);
  }

  // Add dev status changes section (if any)
  const devStatus = createDevStatusSection(commit, colors);
  if (devStatus) {
    container.appendChild(devStatus);
  }

  // Lock the entire frame
  container.locked = true;

  return container;
}
