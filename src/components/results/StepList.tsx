import React from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '../../theme';
import { SolutionStep } from '../../types/analysis';
import { Text } from '../ui/Text';

export function StepList({ steps }: { steps: SolutionStep[] }) {
  const theme = useTheme();

  return (
    <View style={{ gap: theme.spacing.sm }}>
      {steps.map((step) => (
        <View key={step.order} style={styles.row}>
          <View
            style={[
              styles.badge,
              { backgroundColor: theme.colors.accentMuted, borderRadius: theme.radii.pill },
            ]}
          >
            <Text variant="footnote" color="accent" style={styles.badgeText}>
              {step.order}
            </Text>
          </View>
          <Text variant="body" style={styles.instruction}>
            {step.instruction}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  badge: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontWeight: '700',
  },
  instruction: {
    flex: 1,
    paddingTop: 2,
  },
});
