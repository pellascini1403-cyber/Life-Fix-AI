import React from 'react';
import { Text as RNText, TextProps as RNTextProps } from 'react-native';

import { useTheme } from '../../theme';
import { TypographyToken } from '../../theme/typography';

export interface TextProps extends RNTextProps {
  variant?: TypographyToken;
  color?: 'primary' | 'secondary' | 'tertiary' | 'inverse' | 'accent' | 'danger';
}

/**
 * Themed text primitive. Always route body copy through this instead of the
 * raw RN `Text` so type scale and color stay consistent, and so Dynamic
 * Type / font-scale keeps working (we never set `allowFontScaling={false}`).
 */
export function Text({ variant = 'body', color = 'primary', style, ...rest }: TextProps) {
  const theme = useTheme();
  const colorMap = {
    primary: theme.colors.textPrimary,
    secondary: theme.colors.textSecondary,
    tertiary: theme.colors.textTertiary,
    inverse: theme.colors.textInverse,
    accent: theme.colors.accent,
    danger: theme.colors.danger,
  };

  return (
    <RNText
      style={[
        theme.typography[variant],
        { color: colorMap[color], fontFamily: theme.typography.fontFamily },
        style,
      ]}
      {...rest}
    />
  );
}
