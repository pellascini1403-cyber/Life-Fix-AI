import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '../../theme';
import { RiskLevel } from '../../types/analysis';
import { Text } from '../ui/Text';

export interface SafetyBannerProps {
  risk: RiskLevel;
}

/**
 * Surfaces the safety layer's verdict to the user. Deliberately never
 * color-only: an icon + explicit "professional recommended" copy carries
 * the meaning, color is a reinforcement.
 */
export function SafetyBanner({ risk }: SafetyBannerProps) {
  const theme = useTheme();
  const { t } = useTranslation();

  if (risk === 'none' || risk === 'low') return null;

  const isHigh = risk === 'high';
  const bg = isHigh ? (theme.isDark ? '#3A1F1A' : '#FBE7E2') : theme.isDark ? '#3A2E14' : '#FBF0DA';
  const fg = isHigh ? theme.colors.danger : theme.colors.warning;

  return (
    <View
      style={[styles.container, { backgroundColor: bg, borderRadius: theme.radii.md }]}
      accessibilityRole="alert"
    >
      <Ionicons name="warning-outline" size={20} color={fg} />
      <View style={styles.textBlock}>
        <Text variant="bodyStrong" style={{ color: fg }}>
          {t('safety.bannerTitle')}
        </Text>
        <Text variant="footnote" style={{ color: fg, marginTop: 2 }}>
          {isHigh ? t('safety.riskHigh') : t('safety.riskMedium')}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 12,
    gap: 10,
    alignItems: 'flex-start',
  },
  textBlock: {
    flex: 1,
  },
});
