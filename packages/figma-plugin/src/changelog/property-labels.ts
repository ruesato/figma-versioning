/**
 * Property Label Mapping Utility
 *
 * Converts Figma API property names to human-readable labels for display
 * in changelog annotations.
 */

/**
 * Mapping of Figma property names to human-readable labels
 */
const PROPERTY_LABEL_MAP: Record<string, string> = {
  // Layout properties
  width: 'Width',
  height: 'Height',
  maxWidth: 'Max Width',
  minWidth: 'Min Width',
  maxHeight: 'Max Height',
  minHeight: 'Min Height',

  // Visual styling properties
  fills: 'Fills',
  strokes: 'Strokes',
  effects: 'Effects',
  strokeWeight: 'Stroke Weight',
  cornerRadius: 'Corner Radius',
  opacity: 'Opacity',

  // Typography properties
  textStyleId: 'Text Style',
  fontFamily: 'Font Family',
  fontStyle: 'Font Style',
  fontSize: 'Font Size',
  fontWeight: 'Font Weight',
  lineHeight: 'Line Height',
  letterSpacing: 'Letter Spacing',
  textAlignHorizontal: 'Text Alignment',

  // Spacing properties
  itemSpacing: 'Item Spacing',
  padding: 'Padding',
  layoutMode: 'Layout Mode',
  alignItems: 'Align Items',

  // Grid properties
  gridRowGap: 'Grid Row Gap',
  gridColumnGap: 'Grid Column Gap',
  gridRowCount: 'Grid Row Count',
  gridColumnCount: 'Grid Column Count',
  gridRowAnchorIndex: 'Grid Row Anchor',
  gridColumnAnchorIndex: 'Grid Column Anchor',
  gridRowSpan: 'Grid Row Span',
  gridColumnSpan: 'Grid Column Span',

  // Component properties
  mainComponent: 'Main Component',

  // Annotation metadata
  category: 'Category',
};

/**
 * Converts a Figma property name to a human-readable label
 *
 * @param propertyName - The technical API property name (e.g., 'textAlignHorizontal')
 * @returns The human-readable label (e.g., 'Text Alignment')
 *
 * @example
 * ```ts
 * getPropertyLabel('fontSize') // returns 'Font Size'
 * getPropertyLabel('width') // returns 'Width'
 * getPropertyLabel('unknownProp') // returns 'Unknown Prop' (fallback)
 * ```
 */
export function getPropertyLabel(propertyName: string): string {
  // Return mapped label if it exists
  if (propertyName in PROPERTY_LABEL_MAP) {
    return PROPERTY_LABEL_MAP[propertyName];
  }

  // Fallback: convert camelCase to Title Case
  // e.g., 'someNewProperty' -> 'Some New Property'
  return propertyName
    .replace(/([A-Z])/g, ' $1') // Add space before capital letters
    .replace(/^./, (str) => str.toUpperCase()) // Capitalize first letter
    .trim();
}

/**
 * Gets all supported property names
 *
 * @returns Array of all property names that have explicit label mappings
 */
export function getSupportedPropertyNames(): string[] {
  return Object.keys(PROPERTY_LABEL_MAP);
}

/**
 * Checks if a property name has an explicit label mapping
 *
 * @param propertyName - The property name to check
 * @returns True if the property has a defined label mapping
 */
export function hasPropertyLabel(propertyName: string): boolean {
  return propertyName in PROPERTY_LABEL_MAP;
}
