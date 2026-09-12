/**
 * LifeFix AI color tokens.
 *
 * Design intent: warm neutrals (not clinical white/gray), a single restrained
 * teal accent, and no gradients or saturated color. Both palettes must hit
 * WCAG AA contrast for body text against their own background/surface pair.
 */

export interface ColorPalette {
  background: string;
  backgroundElevated: string;
  surface: string;
  surfaceGlass: string;
  border: string;
  borderSubtle: string;

  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  textInverse: string;

  accent: string;
  accentMuted: string;
  onAccent: string;

  success: string;
  warning: string;
  danger: string;

  overlay: string;
}

export const lightColors: ColorPalette = {
  background: '#F7F5F1',
  backgroundElevated: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceGlass: 'rgba(255, 255, 255, 0.72)',
  border: '#E4E0D8',
  borderSubtle: '#ECE9E2',

  textPrimary: '#1C1B19',
  textSecondary: '#5C584F',
  textTertiary: '#8B867A',
  textInverse: '#FFFFFF',

  accent: '#0F8A8A',
  accentMuted: '#E3F1F0',
  onAccent: '#FFFFFF',

  success: '#2E7D5B',
  warning: '#B8790F',
  danger: '#C0402F',

  overlay: 'rgba(20, 18, 15, 0.45)',
};

export const darkColors: ColorPalette = {
  background: '#141311',
  backgroundElevated: '#1D1C19',
  surface: '#1D1C19',
  surfaceGlass: 'rgba(29, 28, 25, 0.72)',
  border: '#332F27',
  borderSubtle: '#26241F',

  textPrimary: '#F4F2ED',
  textSecondary: '#B9B4A8',
  textTertiary: '#847F72',
  textInverse: '#1C1B19',

  accent: '#3FBDBD',
  accentMuted: '#1D3634',
  onAccent: '#0B1F1F',

  success: '#5FBF95',
  warning: '#E0A23A',
  danger: '#E17A68',

  overlay: 'rgba(0, 0, 0, 0.6)',
};
