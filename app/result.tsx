import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Speech from 'expo-speech';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
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
import { createSolutionSimplificationService, SimplifiedSolution } from '../src/services/simplify';
import { useAnalysisSessionStore } from '../src/state/useAnalysisSessionStore';
import { useHistoryStore } from '../src/state/useHistoryStore';
import { useTheme } from '../src/theme';
import { SolutionFeedback } from '../src/types/analysis';
import { getAnalysisErrorMessage } from '../src/utils/analysisErrorMessages';

const simplificationService = createSolutionSimplificationService();

export default function ResultScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { t, i18n } = useTranslation();
  const { status, result, errorCode, reset } = useAnalysisSessionStore();
  const saveToHistory = useHistoryStore((s) => s.save);
  const persistFeedback = useHistoryStore((s) => s.setFeedback);
  const [saved, setSaved] = useState(false);
  const [feedback, setFeedback] = useState<SolutionFeedback | null>(null);
  const [simplified, setSimplified] = useState<SimplifiedSolution | null>(null);
  const [isSimplifying, setIsSimplifying] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechUnavailable, setSpeechUnavailable] = useState(false);
  const usageRecorded = useRef(false);

  useEffect(() => {
    if (status === 'ready' && result && !usageRecorded.current) {
      usageRecorded.current = true;
      void entitlementsService.recordAnalysisUsed();
    }
  }, [status, result]);

  // Never let speech keep playing after the user navigates away.
  useEffect(() => () => void Speech.stop(), []);

  const close = () => {
    void Speech.stop();
    reset();
    router.back();
  };

  const toggleSimplify = async () => {
    if (!result) return;
    if (simplified) {
      setSimplified(null);
      return;
    }
    void Speech.stop();
    setIsSpeaking(false);
    setIsSimplifying(true);
    try {
      const solution = await simplificationService.simplify(result);
      setSimplified(solution);
    } finally {
      setIsSimplifying(false);
    }
  };

  const toggleListen = () => {
    if (isSpeaking) {
      void Speech.stop();
      setIsSpeaking(false);
      return;
    }
    if (!result) return;

    setSpeechUnavailable(false);
    const explanation = simplified?.explanation ?? result.problemExplanation;
    const steps = simplified?.steps ?? result.steps.map((step) => step.instruction);
    const spokenText = [result.problemTitle, explanation, ...steps].join('. ');

    Speech.speak(spokenText, {
      language: i18n.language === 'en' ? 'en-US' : 'es-AR',
      onStart: () => setIsSpeaking(true),
      onDone: () => setIsSpeaking(false),
      onStopped: () => setIsSpeaking(false),
      onError: () => {
        setIsSpeaking(false);
        setSpeechUnavailable(true);
      },
    });
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
    const ok = await saveToHistory(result, feedback);
    if (ok) {
      setSaved(true);
    } else {
      Alert.alert(t('errors.genericTitle'), t('history.saveError'));
    }
  };

  const handleFeedback = (value: SolutionFeedback) => {
    setFeedback(value);
    if (!saved) return;
    void (async () => {
      const ok = await persistFeedback(result.id, value);
      if (!ok) {
        Alert.alert(t('errors.genericTitle'), t('history.feedbackError'));
      }
    })();
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <View style={[styles.topBar, { paddingTop: insets.top + theme.spacing.xs }]}>
        <Pressable
          onPress={close}
          accessibilityRole="button"
          accessibilityLabel={t('common.close')}
          hitSlop={4}
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
            accessibilityLabel={result.problemTitle}
            style={[styles.image, { borderRadius: theme.radii.lg }]}
          />
        ) : null}

        <SafetyBanner risk={result.risk} />

        <View>
          <Text variant="caption" color="tertiary">
            {t('analysis.detectedProblem')}
          </Text>
          <Text variant="title2" accessibilityRole="header" style={{ marginTop: 4 }}>
            {result.problemTitle}
          </Text>
          <Text variant="body" color="secondary" style={{ marginTop: 6 }}>
            {simplified?.explanation ?? result.problemExplanation}
          </Text>
          <View style={{ marginTop: theme.spacing.sm }}>
            <ConfidenceBadge confidence={result.confidence} />
          </View>
        </View>

        <View style={styles.assistRow}>
          <AssistButton
            icon={isSpeaking ? 'stop-circle-outline' : 'volume-high-outline'}
            label={isSpeaking ? t('analysis.stopListening') : t('analysis.listenToSolution')}
            active={isSpeaking}
            onPress={toggleListen}
          />
          <AssistButton
            icon={simplified ? 'return-up-back-outline' : 'sparkles-outline'}
            label={
              isSimplifying
                ? t('analysis.simplifying')
                : simplified
                  ? t('analysis.showOriginal')
                  : t('analysis.explainSimpler')
            }
            active={Boolean(simplified)}
            disabled={isSimplifying}
            onPress={() => void toggleSimplify()}
          />
        </View>

        {speechUnavailable ? (
          <Text variant="footnote" color="secondary">
            {t('analysis.listenUnavailable')}
          </Text>
        ) : null}

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
          <StepList
            steps={
              simplified
                ? simplified.steps.map((instruction, index) => ({ order: index + 1, instruction }))
                : result.steps
            }
          />
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
              onPress={() => handleFeedback('helpful')}
            />
            <FeedbackButton
              label={t('analysis.feedbackNo')}
              icon="thumbs-down-outline"
              active={feedback === 'not_helpful'}
              onPress={() => handleFeedback('not_helpful')}
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

function AssistButton({
  label,
  icon,
  active,
  disabled,
  onPress,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  active: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active, disabled }}
      style={[
        styles.assistButton,
        {
          borderColor: active ? theme.colors.accent : theme.colors.border,
          backgroundColor: active ? theme.colors.accentMuted : theme.colors.surface,
          borderRadius: theme.radii.md,
          opacity: disabled ? 0.6 : 1,
        },
      ]}
    >
      <Ionicons name={icon} size={16} color={active ? theme.colors.accent : theme.colors.textSecondary} />
      <Text variant="footnote" color={active ? 'accent' : 'secondary'} style={{ marginLeft: 6 }}>
        {label}
      </Text>
    </Pressable>
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
  assistRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  assistButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: StyleSheet.hairlineWidth * 2,
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
