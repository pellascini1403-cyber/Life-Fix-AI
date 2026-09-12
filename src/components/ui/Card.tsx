import React from 'react';
import { StyleSheet, View, ViewProps } from 'react-native';

import { useTheme } from '../../theme';

export interface CardProps extends ViewProps {
  glass?: boolean;
  padded?: boolean;
}

/** Generic elevated surface. Uses a hairline border + very soft shadow
 * instead of heavy elevation, per the "subtle, premium" visual direction. */
export function Card({ glass = false, padded = true, style, children, ...rest }: CardProps) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.base,
        {
          backgroundColor: glass ? theme.colors.surfaceGlass : theme.colors.surface,
          borderColor: theme.colors.borderSubtle,
          borderRadius: theme.radii.lg,
          padding: padded ? theme.spacing.md : 0,
        },
        theme.isDark ? styles.shadowDark : styles.shadowLight,
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderWidth: StyleSheet.hairlineWidth,
  },
  shadowLight: {
    shadowColor: '#1C1B19',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  shadowDark: {
    shadowColor: '#000000',
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
});
