import { router } from 'expo-router';
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, FlatList, View } from 'react-native';

import { EmptyState, Header, LoadingState } from '../../src/components/ui';
import { ResultCard } from '../../src/components/results';
import { useAnalysisSessionStore } from '../../src/state/useAnalysisSessionStore';
import { useHistoryStore } from '../../src/state/useHistoryStore';
import { useTheme } from '../../src/theme';

export default function HistoryScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const { entries, status, load, remove } = useHistoryStore();
  const showResult = useAnalysisSessionStore((s) => s.showResult);

  useEffect(() => {
    void load();
  }, [load]);

  const confirmDelete = (analysisId: string) => {
    Alert.alert(t('history.deleteConfirmTitle'), t('history.deleteConfirmBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: () => void remove(analysisId) },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Header title={t('history.title')} />
      {status === 'loading' ? (
        <LoadingState />
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
          contentContainerStyle={{ padding: theme.spacing.lg, gap: theme.spacing.sm }}
          renderItem={({ item }) => (
            <ResultCard
              result={item.result}
              onPress={() => {
                showResult(item.result);
                router.push('/result');
              }}
              onDelete={() => confirmDelete(item.result.id)}
            />
          )}
        />
      )}
    </View>
  );
}
