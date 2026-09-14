import { router } from 'expo-router';
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, FlatList, Pressable, View } from 'react-native';

import { EmptyState, ErrorState, Header, LoadingState, Text } from '../../src/components/ui';
import { ResultCard } from '../../src/components/results';
import { useAnalysisSessionStore } from '../../src/state/useAnalysisSessionStore';
import { useHistoryStore } from '../../src/state/useHistoryStore';
import { useTheme } from '../../src/theme';

export default function HistoryScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const { entries, status, error, load, remove, clear } = useHistoryStore();
  const showResult = useAnalysisSessionStore((s) => s.showResult);

  useEffect(() => {
    void load();
  }, [load]);

  const confirmDelete = (analysisId: string) => {
    Alert.alert(t('history.deleteConfirmTitle'), t('history.deleteConfirmBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () => {
          void (async () => {
            const ok = await remove(analysisId);
            if (!ok) {
              Alert.alert(t('errors.genericTitle'), t('history.deleteError'));
            }
          })();
        },
      },
    ]);
  };

  const confirmClearAll = () => {
    Alert.alert(t('history.clearAllConfirmTitle'), t('history.clearAllConfirmBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () => {
          void (async () => {
            const ok = await clear();
            if (!ok) {
              Alert.alert(t('errors.genericTitle'), t('history.clearError'));
            }
          })();
        },
      },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Header
        title={t('history.title')}
        right={
          entries.length > 0 ? (
            <Pressable
              onPress={confirmClearAll}
              accessibilityRole="button"
              accessibilityLabel={t('history.clearAll')}
              hitSlop={8}
            >
              <Text variant="callout" color="danger">
                {t('history.clearAll')}
              </Text>
            </Pressable>
          ) : undefined
        }
      />
      {status === 'loading' ? (
        <LoadingState />
      ) : status === 'error' ? (
        <ErrorState
          title={t('errors.genericTitle')}
          message={t(error ?? 'history.loadErrorBody')}
          retryLabel={t('common.retry')}
          onRetry={() => void load()}
        />
      ) : entries.length === 0 ? (
        <EmptyState
          icon="time-outline"
          title={t('history.emptyTitle')}
          message={t('history.emptyBody')}
          ctaLabel={t('history.emptyCta')}
          onPressCta={() => router.push('/camera')}
        />
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(item) => item.result.id}
          contentContainerStyle={{
            padding: theme.spacing.lg,
            gap: theme.spacing.sm,
            width: '100%',
            maxWidth: theme.layout.maxContentWidth,
            alignSelf: 'center',
          }}
          renderItem={({ item }) => (
            <ResultCard
              result={item.result}
              onPress={() => { showResult(item.result); router.push('/result'); }}
              onDelete={() => confirmDelete(item.result.id)}
            />
          )}
        />
      )}
    </View>
  );
}
