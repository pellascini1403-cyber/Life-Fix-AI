import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '../../theme';
import { AnalysisResult } from '../../types/analysis';
import { CATEGORY_ICONS } from '../../constants/categories';
import { Card } from '../ui/Card';
import { Text } from '../ui/Text';
import { ConfidenceBadge } from './ConfidenceBadge';

export interface ResultCardProps {
  result: AnalysisResult;
  onPress?: () => void;
  onDelete?: () => void;
}

/** Compact summary of an `AnalysisResult`, used in History list rows. */
export function ResultCard({ result, onPress, onDelete }: ResultCardProps) {
  const theme = useTheme();

  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={result.problemTitle}>
      <Card style={styles.card}>
        {onDelete ? (
          <Pressable
            onPress={onDelete}
            accessibilityRole="button"
            accessibilityLabel="Eliminar"
            hitSlop={8}
            style={styles.deleteButton}
          >
            <Ionicons name="trash-outline" size={18} color={theme.colors.textTertiary} />
          </Pressable>
        ) : null}
        {result.imageUri ? (
          <Image source={{ uri: result.imageUri }} style={[styles.thumb, { borderRadius: theme.radii.md }]} />
        ) : (
          <View
            style={[
              styles.thumb,
              styles.thumbFallback,
              { backgroundColor: theme.colors.accentMuted, borderRadius: theme.radii.md },
            ]}
          >
            <Ionicons
              name={(CATEGORY_ICONS[result.category] ?? 'help-circle-outline') as never}
              size={22}
              color={theme.colors.accent}
            />
          </View>
        )}
        <View style={styles.content}>
          <Text variant="bodyStrong" numberOfLines={1}>
            {result.problemTitle}
          </Text>
          <Text variant="footnote" color="secondary" numberOfLines={2} style={{ marginTop: 2 }}>
            {result.problemExplanation}
          </Text>
          <View style={{ marginTop: 8 }}>
            <ConfidenceBadge confidence={result.confidence} />
          </View>
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: 12,
  },
  thumb: {
    width: 56,
    height: 56,
  },
  thumbFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  deleteButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 1,
  },
});
