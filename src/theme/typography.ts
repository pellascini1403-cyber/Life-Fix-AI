import { Platform } from 'react-native';

/**
 * Type scale. Sizes stay large enough for adult/low-vision readability and
 * scale with the OS Dynamic Type / font-scale setting by default, since we
 * use RN's unitless numbers rather than disabling `allowFontScaling`.
 */
export const typography = {
  fontFamily: Platform.select({
    ios: 'System',
    android: 'sans-serif',
    default: 'System',
  }),
  display: { fontSize: 32, lineHeight: 40, fontWeight: '700' as const },
  title1: { fontSize: 26, lineHeight: 33, fontWeight: '700' as const },
  title2: { fontSize: 21, lineHeight: 27, fontWeight: '600' as const },
  headline: { fontSize: 17, lineHeight: 23, fontWeight: '600' as const },
  body: { fontSize: 16, lineHeight: 23, fontWeight: '400' as const },
  bodyStrong: { fontSize: 16, lineHeight: 23, fontWeight: '600' as const },
  callout: { fontSize: 15, lineHeight: 21, fontWeight: '400' as const },
  footnote: { fontSize: 13, lineHeight: 18, fontWeight: '400' as const },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '500' as const },
};

export type TypographyToken = Exclude<keyof typeof typography, 'fontFamily'>;
