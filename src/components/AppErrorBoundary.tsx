import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text as RNText, useColorScheme, View } from 'react-native';

import { darkColors, lightColors } from '../theme/colors';

export interface AppErrorBoundaryProps {
  error: Error;
  retry: () => Promise<void>;
}

/**
 * Fallback UI for Expo Router's `ErrorBoundary` route convention — exported
 * as `ErrorBoundary` from `app/_layout.tsx`, this catches a render error
 * anywhere in the app and shows a recovery screen instead of a blank one.
 *
 * Deliberately self-contained: it never calls `useTheme()`, since the crash
 * that triggers this may have happened inside `ThemeProvider` itself (which
 * lives inside the same root layout this boundary wraps). Colors come
 * straight from the theme's plain color constants instead.
 */
export function AppErrorBoundary({ error, retry }: AppErrorBoundaryProps) {
  const { t } = useTranslation();
  const scheme = useColorScheme();
  const colors = scheme === 'dark' ? darkColors : lightColors;

  console.error('[Resolia] Unexpected render error:', error);

  const goHome = () => {
    router.replace('/');
    void retry();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Ionicons name="alert-circle-outline" size={40} color={colors.danger} />
      <RNText style={[styles.title, { color: colors.textPrimary }]}>{t('errors.genericTitle')}</RNText>
      <RNText style={[styles.body, { color: colors.textSecondary }]}>{t('errorBoundary.body')}</RNText>

      <Pressable
        onPress={() => void retry()}
        accessibilityRole="button"
        accessibilityLabel={t('common.retry')}
        style={[styles.primaryButton, { backgroundColor: colors.accent }]}
      >
        <RNText style={[styles.primaryButtonLabel, { color: colors.onAccent }]}>{t('common.retry')}</RNText>
      </Pressable>

      <Pressable
        onPress={goHome}
        accessibilityRole="button"
        accessibilityLabel={t('errorBoundary.goHome')}
        style={styles.secondaryButton}
      >
        <RNText style={[styles.secondaryButtonLabel, { color: colors.accent }]}>
          {t('errorBoundary.goHome')}
        </RNText>
      </Pressable>
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
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 16,
    textAlign: 'center',
  },
  body: {
    fontSize: 15,
    marginTop: 8,
    textAlign: 'center',
  },
  primaryButton: {
    marginTop: 24,
    width: '100%',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  primaryButtonLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    marginTop: 12,
    paddingVertical: 10,
  },
  secondaryButtonLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
});
