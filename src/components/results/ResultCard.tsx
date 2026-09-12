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

/**
 * Compact summary of an `AnalysisResult`, used in History list rows.
 *
 * The tap-to-open area and the delete button are sibling `Pressable`s
 * rather than nested ones: on web, react-native-web renders `Pressable`
 * as a `<button>`, and a `<button>` inside another `<button>` is invalid
 * HTML (it breaks click handling and trips a hydration warning).
 */
export function ResultCard({ result, onPress, onDelete }: ResultCardProps) {
  const theme = useTheme();

  return (
    <Card style={styles.card}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={result.problemTitle}
        style={styles.pressableContent}
      >
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
      </Pressable>
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
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'relative',
  },
  pressableContent: {
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
