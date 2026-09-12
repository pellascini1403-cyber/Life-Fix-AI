import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useTheme } from '../../theme';
import { Text } from '../ui/Text';

export interface TimeIndicatorProps {
  range: { min: number; max: number } | null;
}

export function TimeIndicator({ range }: TimeIndicatorProps) {
  const theme = useTheme();
  const { t } = useTranslation();

  if (!range) return null;

  return (
    <View>
      <Text variant="caption" color="tertiary">
        {t('analysis.estimatedTime')}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 6 }}>
        <Ionicons name="time-outline" size={18} color={theme.colors.textSecondary} />
        <Text variant="callout">
          {range.min}–{range.max} min
        </Text>
      </View>
    </View>
  );
}
