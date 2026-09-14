import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '../../theme';
import { Button } from './Button';
import { Text } from './Text';

export interface EmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  message?: string;
  ctaLabel?: string;
  onPressCta?: () => void;
}

export function EmptyState({
  icon = 'file-tray-outline',
  title,
  message,
  ctaLabel,
  onPressCta,
}: EmptyStateProps) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.container,
        { width: '100%', maxWidth: theme.layout.maxContentWidth, alignSelf: 'center' },
      ]}
    >
      <View
        style={[
          styles.iconWrap,
          { backgroundColor: theme.colors.accentMuted, borderRadius: theme.radii.pill },
        ]}
      >
        <Ionicons name={icon} size={28} color={theme.colors.accent} />
      </View>
      <Text variant="headline" style={{ marginTop: theme.spacing.md, textAlign: 'center' }}>
        {title}
      </Text>
      {message ? (
        <Text
          variant="callout"
          color="secondary"
          style={{ marginTop: theme.spacing.xxs, textAlign: 'center' }}
        >
          {message}
        </Text>
      ) : null}
      {ctaLabel && onPressCta ? (
        <View style={{ marginTop: theme.spacing.lg, width: '100%' }}>
          <Button label={ctaLabel} onPress={onPressCta} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  iconWrap: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
