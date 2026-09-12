import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useTheme } from '../../theme';
import { Text } from './Text';

export interface LoadingStateProps {
  message?: string;
  hint?: string;
}

/** Full-bleed loading placeholder for a screen or section. */
export function LoadingState({ message, hint }: LoadingStateProps) {
  const theme = useTheme();

  return (
    <View style={styles.container} accessibilityRole="progressbar" accessibilityLabel={message}>
      <ActivityIndicator size="large" color={theme.colors.accent} />
      {message ? (
        <Text variant="bodyStrong" style={{ marginTop: theme.spacing.md, textAlign: 'center' }}>
          {message}
        </Text>
      ) : null}
      {hint ? (
        <Text
          variant="footnote"
          color="secondary"
          style={{ marginTop: theme.spacing.xxs, textAlign: 'center' }}
        >
          {hint}
        </Text>
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
});
