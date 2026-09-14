import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, View } from 'react-native';

import { Card, Header, Text } from '../src/components/ui';
import { useTheme } from '../src/theme';

export default function AboutScreen() {
  const theme = useTheme();
  const { t } = useTranslation();

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Header
        title={t('about.title')}
        right={
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel={t('common.close')}
            hitSlop={8}
          >
            <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
          </Pressable>
        }
      />
      <ScrollView
        contentContainerStyle={{
          padding: theme.spacing.lg,
          gap: theme.spacing.md,
          width: '100%',
          maxWidth: theme.layout.maxContentWidth,
          alignSelf: 'center',
        }}
        showsVerticalScrollIndicator={false}
      >
        <Card>
          <Text variant="body" color="secondary">
            {t('about.intro')}
          </Text>
        </Card>
        <Card>
          <Text variant="headline" style={{ marginBottom: theme.spacing.xs }}>
            {t('about.howItWorksTitle')}
          </Text>
          <Text variant="body" color="secondary">
            {t('about.howItWorksBody')}
          </Text>
        </Card>
        <Card>
          <Text variant="headline" style={{ marginBottom: theme.spacing.xs }}>
            {t('about.statusTitle')}
          </Text>
          <Text variant="body" color="secondary">
            {t('about.statusBody')}
          </Text>
        </Card>
      </ScrollView>
    </View>
  );
}
