/**
 * Property Value Formatting Utility
 *
 * Formats Figma property values for display in changelog annotations.
 * Handles different value types (colors, numbers, strings, objects).
 */

/**
 * Properties that should display with 'px' units
 */
const PIXEL_PROPERTIES = new Set([
  'width',
  'height',
  'maxWidth',
  'minWidth',
  'maxHeight',
  'minHeight',
  'strokeWeight',
  'cornerRadius',
  'fontSize',
  'lineHeight',
  'letterSpacing',
  'itemSpacing',
  'padding',
  'gridRowGap',
  'gridColumnGap',
]);

/**
 * Converts an RGB object to a hex color string
 */
function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => {
    const hex = Math.round(n * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

/**
 * Formats a paint (fill or stroke) object to a readable string
 */
function formatPaint(paint: unknown): string {
  if (typeof paint !== 'object' || paint === null) {
    return 'Unknown';
  }

  const paintObj = paint as Record<string, unknown>;

  // Handle solid color paint
  if (paintObj.type === 'SOLID' && paintObj.color) {
    const color = paintObj.color as { r: number; g: number; b: number };
    const opacity = typeof paintObj.opacity === 'number' ? paintObj.opacity : 1;
    const hex = rgbToHex(color.r, color.g, color.b);

    if (opacity < 1) {
      return `${hex} (${Math.round(opacity * 100)}%)`;
    }
    return hex;
  }

  // Handle other paint types
  if (paintObj.type === 'IMAGE') {
    return 'Image fill';
  }
  if (paintObj.type === 'GRADIENT_LINEAR') {
    return 'Linear gradient';
  }
  if (paintObj.type === 'GRADIENT_RADIAL') {
    return 'Radial gradient';
  }
  if (paintObj.type === 'GRADIENT_ANGULAR') {
    return 'Angular gradient';
  }
  if (paintObj.type === 'GRADIENT_DIAMOND') {
    return 'Diamond gradient';
  }

  return String(paintObj.type || 'Unknown');
}

/**
 * Formats a fills or strokes array to a readable string
 */
function formatPaints(paints: unknown): string {
  if (!Array.isArray(paints)) {
    return 'None';
  }

  if (paints.length === 0) {
    return 'None';
  }

  if (paints.length === 1) {
    return formatPaint(paints[0]);
  }

  return paints.map(formatPaint).join(', ');
}

/**
 * Formats a numeric value with appropriate units
 */
function formatNumericValue(value: number, propertyName: string): string {
  // Properties that use pixels
  if (PIXEL_PROPERTIES.has(propertyName)) {
    return `${value}px`;
  }

  // Opacity is 0-1, display as percentage
  if (propertyName === 'opacity') {
    return `${Math.round(value * 100)}%`;
  }

  // Grid counts and indices don't need units
  if (propertyName.includes('Count') || propertyName.includes('Index') || propertyName.includes('Span')) {
    return String(value);
  }

  // Default: number without units
  return String(value);
}

/**
 * Formats an object value to a readable string
 */
function formatObjectValue(value: Record<string, unknown>, propertyName: string): string {
  // Handle specific known object types
  if (propertyName === 'padding' && typeof value === 'object') {
    // Padding might be an object with top, right, bottom, left
    const parts: string[] = [];
    if ('top' in value) parts.push(`top: ${value.top}px`);
    if ('right' in value) parts.push(`right: ${value.right}px`);
    if ('bottom' in value) parts.push(`bottom: ${value.bottom}px`);
    if ('left' in value) parts.push(`left: ${value.left}px`);
    if (parts.length > 0) return parts.join(', ');
  }

  // Generic object representation
  const keys = Object.keys(value);
  if (keys.length === 0) {
    return '{}';
  }

  // If it has a 'type' property, show that
  if ('type' in value) {
    return String(value.type);
  }

  // Show the object type or simplified representation
  return `{${keys.length} properties}`;
}

/**
 * Formats a property value for display in the changelog
 *
 * @param value - The raw property value from the annotation
 * @param propertyName - The property name (used to determine formatting)
 * @returns A human-readable string representation of the value
 *
 * @example
 * ```ts
 * formatPropertyValue(100, 'width') // returns '100px'
 * formatPropertyValue(0.5, 'opacity') // returns '50%'
 * formatPropertyValue([{type: 'SOLID', color: {r: 1, g: 0, b: 0}}], 'fills') // returns '#FF0000'
 * formatPropertyValue('HORIZONTAL', 'layoutMode') // returns 'HORIZONTAL'
 * ```
 */
export function formatPropertyValue(value: unknown, propertyName: string): string {
  // Handle null/undefined
  if (value === null || value === undefined) {
    return 'None';
  }

  // Handle boolean
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }

  // Handle number
  if (typeof value === 'number') {
    return formatNumericValue(value, propertyName);
  }

  // Handle string
  if (typeof value === 'string') {
    return value;
  }

  // Handle arrays (like fills, strokes, effects)
  if (Array.isArray(value)) {
    // Special handling for fills and strokes
    if (propertyName === 'fills' || propertyName === 'strokes') {
      return formatPaints(value);
    }

    // Generic array handling
    if (value.length === 0) {
      return 'None';
    }
    if (value.length === 1) {
      return formatPropertyValue(value[0], propertyName);
    }
    return `[${value.length} items]`;
  }

  // Handle objects
  if (typeof value === 'object') {
    return formatObjectValue(value as Record<string, unknown>, propertyName);
  }

  // Fallback: convert to string
  return String(value);
}

/**
 * Formats a property name and value together as a display string
 *
 * @param propertyName - The property name (will be converted to a label)
 * @param value - The property value
 * @param getLabel - Optional function to convert property name to label (defaults to identity)
 * @returns Formatted string in "Label: value" format
 *
 * @example
 * ```ts
 * formatProperty('width', 100, getPropertyLabel) // returns 'Width: 100px'
 * formatProperty('fills', [{...}], getPropertyLabel) // returns 'Fills: #FF0000'
 * ```
 */
export function formatProperty(
  propertyName: string,
  value: unknown,
  getLabel?: (name: string) => string
): string {
  const label = getLabel ? getLabel(propertyName) : propertyName;
  const formattedValue = formatPropertyValue(value, propertyName);
  return `${label}: ${formattedValue}`;
}
