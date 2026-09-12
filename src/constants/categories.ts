import { ProblemCategory } from '../types/analysis';

export const CATEGORIES: readonly ProblemCategory[] = [
  'home',
  'repairs',
  'cleaning',
  'clothing',
  'garden',
  'objects',
  'other',
] as const;

/** Ionicons glyph name per category, used by the Home category grid. */
export const CATEGORY_ICONS: Record<ProblemCategory, string> = {
  home: 'home-outline',
  repairs: 'construct-outline',
  cleaning: 'sparkles-outline',
  clothing: 'shirt-outline',
  garden: 'leaf-outline',
  objects: 'cube-outline',
  other: 'ellipsis-horizontal-circle-outline',
};
