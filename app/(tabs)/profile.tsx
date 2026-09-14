import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Badge, Button, Card, Header, Text } from '../../src/components/ui';
import { entitlementsService } from '../../src/services/entitlements/EntitlementsService';
import { changeAndPersistLanguage, supportedLanguages } from '../../src/i18n';
import { useTheme } from '../../src/theme';
import { Entitlements } from '../../src/types/entitlements';

interface MenuRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress?: () => void;
  right?: React.ReactNode;
}

function MenuRow({ icon, label, onPress, right }: MenuRowProps) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.menuRow, { opacity: pressed && onPress ? 0.6 : 1 }]}
    >
      <Ionicons name={icon} size={20} color={theme.colors.textSecondary} />
      <Text variant="body" style={styles.menuLabel}>
        {label}
      </Text>
      {right ?? <Ionicons name="chevron-forward" size={18} color={theme.colors.textTertiary} />}
    </Pressable>
  );
}

export default function ProfileScreen() {
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const [entitlements, setEntitlements] = useState<Entitlements | null>(null);

  useFocusEffect(
    useCallback(() => {
      void entitlementsService.getEntitlements().then(setEntitlements);
    }, []),
  );

  const isPro = entitlements?.plan === 'pro';
  const analysesLeft = entitlements?.limits.dailyAnalyses
    ? entitlements.limits.dailyAnalyses - entitlements.analysesUsedToday
    : null;

  const toggleLanguage = () => {
    const next = i18n.language === 'es' ? 'en' : 'es';
    void changeAndPersistLanguage(next);
  };

  const showComingSoon = () => {
    Alert.alert(t('profile.comingSoonTitle'), t('profile.comingSoonBody'));
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Header title={t('profile.title')} />
      <ScrollView
        contentContainerStyle={{
          padding: theme.spacing.lg,
          gap: theme.spacing.lg,
          width: '100%',
          maxWidth: theme.layout.maxContentWidth,
          alignSelf: 'center',
        }}
        showsVerticalScrollIndicator={false}
      >
        <Card>
          <View style={styles.planRow}>
            <View>
              <Text variant="headline">{isPro ? t('profile.planPro') : t('profile.planFree')}</Text>
              {!isPro && analysesLeft !== null ? (
                <Text variant="footnote" color="secondary" style={{ marginTop: 2 }}>
                  {t('profile.dailyAnalysesLeft', { count: analysesLeft })}
                </Text>
              ) : null}
            </View>
            <Badge label={isPro ? 'PRO' : 'FREE'} tone={isPro ? 'accent' : 'neutral'} />
          </View>
          {!isPro ? (
            <View style={{ marginTop: theme.spacing.md }}>
              <Button label={t('profile.upgradeCta')} size="default" onPress={showComingSoon} />
            </View>
          ) : null}
        </Card>

        <Card padded={false}>
          <MenuRow
            icon="language-outline"
            label={t('profile.language')}
            onPress={toggleLanguage}
            right={
              <Text variant="footnote" color="secondary">
                {supportedLanguages.includes(i18n.language as never) ? i18n.language.toUpperCase() : 'ES'}
              </Text>
            }
          />
          <View style={[styles.divider, { backgroundColor: theme.colors.borderSubtle }]} />
          <MenuRow icon="notifications-outline" label={t('profile.notifications')} onPress={showComingSoon} />
          <View style={[styles.divider, { backgroundColor: theme.colors.borderSubtle }]} />
          <MenuRow
            icon="shield-checkmark-outline"
            label={t('profile.privacy')}
            onPress={() => router.push('/privacy')}
          />
          <View style={[styles.divider, { backgroundColor: theme.colors.borderSubtle }]} />
          <MenuRow icon="help-circle-outline" label={t('profile.help')} onPress={() => router.push('/help')} />
          <View style={[styles.divider, { backgroundColor: theme.colors.borderSubtle }]} />
          <MenuRow
            icon="information-circle-outline"
            label={t('profile.about')}
            onPress={() => router.push('/about')}
          />
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  planRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  menuLabel: {
    flex: 1,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 48,
  },
});
