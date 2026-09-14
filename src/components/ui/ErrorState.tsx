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
  /** Shows a spinner and disables the retry button — for a caller that
   * needs to block a second tap while the retry is already in flight. */
  retryLoading?: boolean;
  /** Optional secondary action (e.g. "Close"/"Cancel") shown below retry,
   * for a screen where giving up is also a valid, distinct choice from
   * retrying. Omitted entirely when not provided. */
  secondaryLabel?: string;
  onSecondaryAction?: () => void;
}

export function ErrorState({
  title,
  message,
  retryLabel,
  onRetry,
  retryLoading,
  secondaryLabel,
  onSecondaryAction,
}: ErrorStateProps) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.container,
        { width: '100%', maxWidth: theme.layout.maxContentWidth, alignSelf: 'center' },
      ]}
      accessibilityRole="alert"
    >
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
          <Button
            label={retryLabel ?? 'Reintentar'}
            variant="secondary"
            onPress={onRetry}
            loading={retryLoading}
          />
        </View>
      ) : null}
      {onSecondaryAction ? (
        <View style={{ marginTop: theme.spacing.sm, width: '100%' }}>
          <Button label={secondaryLabel ?? 'Cancelar'} variant="ghost" onPress={onSecondaryAction} />
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
