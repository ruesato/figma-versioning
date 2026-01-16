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
  border: RGB;
  text: RGB;
  textSecondary: RGB;
  accent: RGB;
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
        background: { r: 1, g: 1, b: 1 },           // White
        surface: { r: 0.98, g: 0.98, b: 0.98 },    // Light gray
        border: { r: 0.9, g: 0.9, b: 0.9 },        // Medium-light gray
        text: { r: 0.1, g: 0.1, b: 0.1 },          // Near black
        textSecondary: { r: 0.5, g: 0.5, b: 0.5 }, // Medium gray
        accent: { r: 0.2, g: 0.47, b: 1 }          // Figma blue
      };

    case 'dark':
      return {
        background: { r: 0.11, g: 0.11, b: 0.11 }, // Dark gray
        surface: { r: 0.15, g: 0.15, b: 0.15 },    // Slightly lighter
        border: { r: 0.25, g: 0.25, b: 0.25 },     // Medium-dark gray
        text: { r: 0.95, g: 0.95, b: 0.95 },       // Near white
        textSecondary: { r: 0.6, g: 0.6, b: 0.6 }, // Medium-light gray
        accent: { r: 0.4, g: 0.6, b: 1 }           // Lighter blue
      };

    case 'figjam':
      return {
        background: { r: 0.97, g: 0.95, b: 0.91 }, // FigJam cream
        surface: { r: 1, g: 1, b: 1 },             // White
        border: { r: 0.2, g: 0.2, b: 0.2 },        // Dark gray
        text: { r: 0.1, g: 0.1, b: 0.1 },          // Near black
        textSecondary: { r: 0.4, g: 0.4, b: 0.4 }, // Medium-dark gray
        accent: { r: 0.51, g: 0.35, b: 1 }         // FigJam purple
      };
  }
}
