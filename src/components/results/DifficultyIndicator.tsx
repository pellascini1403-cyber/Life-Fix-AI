import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '../../theme';
import { DifficultyLevel } from '../../types/analysis';
import { Text } from '../ui/Text';

const LEVELS: DifficultyLevel[] = ['easy', 'medium', 'hard'];

export function DifficultyIndicator({ difficulty }: { difficulty: DifficultyLevel }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const activeIndex = LEVELS.indexOf(difficulty);

  const labels: Record<DifficultyLevel, string> = {
    easy: t('analysis.difficultyEasy'),
    medium: t('analysis.difficultyMedium'),
    hard: t('analysis.difficultyHard'),
  };

  return (
    <View>
      <Text variant="caption" color="tertiary">
        {t('analysis.difficulty')}
      </Text>
      <View style={styles.row}>
        <View style={styles.dots}>
          {LEVELS.map((level, index) => (
            <View
              key={level}
              style={[
                styles.dot,
                {
                  backgroundColor: index <= activeIndex ? theme.colors.accent : theme.colors.borderSubtle,
                },
              ]}
            />
          ))}
        </View>
        <Text variant="callout" style={{ marginLeft: 8 }}>
          {labels[difficulty]}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  dots: {
    flexDirection: 'row',
    gap: 4,
  },
  dot: {
    width: 16,
    height: 6,
    borderRadius: 3,
  },
});
