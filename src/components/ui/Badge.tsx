import React from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '../../theme';
import { Text } from './Text';

export type BadgeTone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger';

export interface BadgeProps {
  label: string;
  tone?: BadgeTone;
  icon?: React.ReactNode;
}

/** Small status label. Never the only signal for something important —
 * pair with an icon or text, not color alone (see safety banner usage). */
export function Badge({ label, tone = 'neutral', icon }: BadgeProps) {
  const theme = useTheme();

  const toneColors: Record<BadgeTone, { bg: string; fg: string }> = {
    neutral: { bg: theme.colors.borderSubtle, fg: theme.colors.textSecondary },
    accent: { bg: theme.colors.accentMuted, fg: theme.colors.accent },
    success: { bg: theme.isDark ? '#1E3A2D' : '#E4F3EB', fg: theme.colors.success },
    warning: { bg: theme.isDark ? '#3A2E14' : '#FBF0DA', fg: theme.colors.warning },
    danger: { bg: theme.isDark ? '#3A1F1A' : '#FBE7E2', fg: theme.colors.danger },
  };

  const { bg, fg } = toneColors[tone];

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: bg, borderRadius: theme.radii.pill, paddingHorizontal: theme.spacing.xs },
      ]}
    >
      {icon}
      <Text variant="caption" style={{ color: fg }}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 26,
    alignSelf: 'flex-start',
  },
});
