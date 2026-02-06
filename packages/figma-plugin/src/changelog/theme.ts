/**
 * Theme Detection and Color Management
 *
 * Handles theme detection (Light/Dark/FigJam) and provides
 * appropriate color palettes for changelog rendering.
 */

export type Theme = 'light' | 'dark' | 'figjam';

export interface ThemeColors {
  background: RGB;
  surface: RGB;
  headerBackground: RGB;
  border: RGB;
  text: RGB;
  textSecondary: RGB;
  textMuted: RGB;
  accent: RGB;
  commentBadge: RGB;
  annotationBadge: RGB;
}

/**
 * Detect the current theme based on editor type
 * FigJam is detected via figma.editorType, defaults to Light for regular Figma
 *
 * @returns The detected theme
 */
export function detectTheme(): Theme {
  if (figma.editorType === 'figjam') {
    return 'figjam';
  }

  // Default to light theme for regular Figma
  // Note: There's no reliable way to detect user's Figma UI theme preference
  // from the plugin API, so we default to light mode
  return 'light';
}

/**
 * Get color palette for the specified theme
 *
 * @param theme - The theme to get colors for
 * @returns RGB color palette for the theme
 */
export function getThemeColors(theme: Theme): ThemeColors {
  switch (theme) {
    case 'light':
      return {
        background: { r: 1, g: 1, b: 1 },                    // White
        surface: { r: 0.98, g: 0.98, b: 0.98 },              // Light gray
        headerBackground: { r: 0.937, g: 0.937, b: 0.937 },  // #efefef
        border: { r: 0.875, g: 0.875, b: 0.875 },            // #e0e0e0
        text: { r: 0.2, g: 0.2, b: 0.2 },                    // #333333
        textSecondary: { r: 0.467, g: 0.467, b: 0.467 },     // #777777
        textMuted: { r: 0.502, g: 0.502, b: 0.502 },         // #808080
        accent: { r: 0.2, g: 0.47, b: 1 },                   // Figma blue
        commentBadge: { r: 0.98, g: 0.31, b: 0.043 },        // #fa4f0b orange
        annotationBadge: { r: 0.204, g: 0.361, b: 0.8 }      // #345ccc blue
      };

    case 'dark':
      return {
        background: { r: 0.11, g: 0.11, b: 0.11 },           // Dark gray
        surface: { r: 0.15, g: 0.15, b: 0.15 },              // Slightly lighter
        headerBackground: { r: 0.18, g: 0.18, b: 0.18 },     // Darker header
        border: { r: 0.25, g: 0.25, b: 0.25 },               // Medium-dark gray
        text: { r: 0.95, g: 0.95, b: 0.95 },                 // Near white
        textSecondary: { r: 0.6, g: 0.6, b: 0.6 },           // Medium-light gray
        textMuted: { r: 0.5, g: 0.5, b: 0.5 },               // Muted gray
        accent: { r: 0.4, g: 0.6, b: 1 },                    // Lighter blue
        commentBadge: { r: 0.98, g: 0.31, b: 0.043 },        // #fa4f0b orange
        annotationBadge: { r: 0.204, g: 0.361, b: 0.8 }      // #345ccc blue
      };

    case 'figjam':
      return {
        background: { r: 0.97, g: 0.95, b: 0.91 },           // FigJam cream
        surface: { r: 1, g: 1, b: 1 },                       // White
        headerBackground: { r: 0.95, g: 0.93, b: 0.89 },     // Slightly darker cream
        border: { r: 0.2, g: 0.2, b: 0.2 },                  // Dark gray
        text: { r: 0.1, g: 0.1, b: 0.1 },                    // Near black
        textSecondary: { r: 0.4, g: 0.4, b: 0.4 },           // Medium-dark gray
        textMuted: { r: 0.5, g: 0.5, b: 0.5 },               // Muted gray
        accent: { r: 0.51, g: 0.35, b: 1 },                  // FigJam purple
        commentBadge: { r: 0.98, g: 0.31, b: 0.043 },        // #fa4f0b orange
        annotationBadge: { r: 0.51, g: 0.35, b: 1 }          // FigJam purple for annotations
      };
  }
}
