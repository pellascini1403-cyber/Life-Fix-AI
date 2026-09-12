import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  ConfidenceBadge,
  DifficultyIndicator,
  SafetyBanner,
  StepList,
  TimeIndicator,
} from '../src/components/results';
import { Button, Card, ErrorState, LoadingState, Text } from '../src/components/ui';
import { entitlementsService } from '../src/services/entitlements/EntitlementsService';
import { useAnalysisSessionStore } from '../src/state/useAnalysisSessionStore';
import { useHistoryStore } from '../src/state/useHistoryStore';
import { useTheme } from '../src/theme';
import { SolutionFeedback } from '../src/types/analysis';
import { getAnalysisErrorMessage } from '../src/utils/analysisErrorMessages';

export default function ResultScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { status, result, errorCode, reset } = useAnalysisSessionStore();
  const saveToHistory = useHistoryStore((s) => s.save);
  const [saved, setSaved] = useState(false);
  const [feedback, setFeedback] = useState<SolutionFeedback | null>(null);
  const usageRecorded = useRef(false);

  useEffect(() => {
    if (status === 'ready' && result && !usageRecorded.current) {
      usageRecorded.current = true;
      void entitlementsService.recordAnalysisUsed();
    }
  }, [status, result]);

  const close = () => {
    reset();
    router.back();
  };

  if (status === 'analyzing' || status === 'idle') {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <LoadingState message={t('analysis.analyzing')} hint={t('analysis.analyzingHint')} />
      </View>
    );
  }

  if (status === 'error' || !result) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <ErrorState
          title={t('errors.genericTitle')}
          message={errorCode ? getAnalysisErrorMessage(t, errorCode) : t('errors.genericBody')}
          retryLabel={t('common.close')}
          onRetry={close}
        />
      </View>
    );
  }

  const handleSave = async () => {
    await saveToHistory(result);
    setSaved(true);
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <View style={[styles.topBar, { paddingTop: insets.top + theme.spacing.xs }]}>
        <Pressable
          onPress={close}
          accessibilityRole="button"
          accessibilityLabel={t('common.close')}
          style={[styles.closeButton, { backgroundColor: theme.colors.surfaceGlass }]}
        >
          <Ionicons name="close" size={22} color={theme.colors.textPrimary} />
        </Pressable>
      </View>
      <ScrollView
        contentContainerStyle={{
          padding: theme.spacing.lg,
          paddingBottom: insets.bottom + theme.spacing.xl,
          gap: theme.spacing.md,
        }}
        showsVerticalScrollIndicator={false}
      >
        {result.imageUri ? (
          <Image
            source={{ uri: result.imageUri }}
            style={[styles.image, { borderRadius: theme.radii.lg }]}
          />
        ) : null}

        <SafetyBanner risk={result.risk} />

        <View>
          <Text variant="caption" color="tertiary">
            {t('analysis.detectedProblem')}
          </Text>
          <Text variant="title2" style={{ marginTop: 4 }}>
            {result.problemTitle}
          </Text>
          <Text variant="body" color="secondary" style={{ marginTop: 6 }}>
            {result.problemExplanation}
          </Text>
          <View style={{ marginTop: theme.spacing.sm }}>
            <ConfidenceBadge confidence={result.confidence} />
          </View>
        </View>

        <Card>
          <View style={styles.metaRow}>
            <TimeIndicator range={result.estimatedTimeMinutes} />
            <DifficultyIndicator difficulty={result.difficulty} />
          </View>
        </Card>

        <Card>
          <Text variant="headline" style={{ marginBottom: theme.spacing.sm }}>
            {t('analysis.whatToDo')}
          </Text>
          <StepList steps={result.steps} />
        </Card>

        {result.requiredItems.length > 0 ? (
          <Card>
            <Text variant="headline" style={{ marginBottom: theme.spacing.xs }}>
              {t('analysis.youNeed')}
            </Text>
            {result.requiredItems.map((item) => (
              <Text key={item} variant="body" color="secondary">
                {'•'} {item}
              </Text>
            ))}
          </Card>
        ) : null}

        {result.warnings.length > 0 ? (
          <Card>
            <Text variant="headline" color="danger" style={{ marginBottom: theme.spacing.xs }}>
              {t('analysis.whatNotToDo')}
            </Text>
            {result.warnings.map((warning) => (
              <Text key={warning} variant="body" color="secondary">
                {'•'} {warning}
              </Text>
            ))}
          </Card>
        ) : null}

        {result.followUpQuestions.length > 0 ? (
          <Card>
            <Text variant="headline" style={{ marginBottom: theme.spacing.xs }}>
              {t('analysis.followUpQuestions')}
            </Text>
            {result.followUpQuestions.map((question) => (
              <Text key={question} variant="body" color="secondary">
                {'•'} {question}
              </Text>
            ))}
          </Card>
        ) : null}

        <Card>
          <Text variant="bodyStrong" style={{ marginBottom: theme.spacing.sm }}>
            {t('analysis.feedbackQuestion')}
          </Text>
          <View style={styles.feedbackRow}>
            <FeedbackButton
              label={t('analysis.feedbackYes')}
              icon="thumbs-up-outline"
              active={feedback === 'helpful'}
              onPress={() => setFeedback('helpful')}
            />
            <FeedbackButton
              label={t('analysis.feedbackNo')}
              icon="thumbs-down-outline"
              active={feedback === 'not_helpful'}
              onPress={() => setFeedback('not_helpful')}
            />
          </View>
        </Card>

        <Button
          label={saved ? t('common.save') + ' ✓' : t('analysis.saveToHistory')}
          onPress={handleSave}
          disabled={saved}
          variant={saved ? 'secondary' : 'primary'}
        />
      </ScrollView>
    </View>
  );
}

function FeedbackButton({
  label,
  icon,
  active,
  onPress,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  active: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[
        styles.feedbackButton,
        {
          borderColor: active ? theme.colors.accent : theme.colors.border,
          backgroundColor: active ? theme.colors.accentMuted : 'transparent',
          borderRadius: theme.radii.md,
        },
      ]}
    >
      <Ionicons name={icon} size={18} color={active ? theme.colors.accent : theme.colors.textSecondary} />
      <Text variant="footnote" color={active ? 'accent' : 'secondary'} style={{ marginLeft: 6 }}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  topBar: {
    position: 'absolute',
    top: 0,
    right: 0,
    zIndex: 1,
    paddingHorizontal: 16,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: 220,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  feedbackRow: {
    flexDirection: 'row',
    gap: 12,
  },
  feedbackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
});
