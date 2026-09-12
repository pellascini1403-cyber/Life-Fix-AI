import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '../../theme';
import { Button } from './Button';
import { Text } from './Text';

export interface ErrorStateProps {
  title: string;
  message?: string;
  retryLabel?: string;
  onRetry?: () => void;
}

export function ErrorState({ title, message, retryLabel, onRetry }: ErrorStateProps) {
  const theme = useTheme();

  return (
    <View style={styles.container} accessibilityRole="alert">
      <Ionicons name="alert-circle-outline" size={40} color={theme.colors.danger} />
      <Text variant="headline" style={{ marginTop: theme.spacing.sm, textAlign: 'center' }}>
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
      {onRetry ? (
        <View style={{ marginTop: theme.spacing.lg, width: '100%' }}>
          <Button label={retryLabel ?? 'Reintentar'} variant="secondary" onPress={onRetry} />
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
});
