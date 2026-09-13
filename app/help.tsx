import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, View } from 'react-native';

import { Card, Header, Text } from '../src/components/ui';
import { useTheme } from '../src/theme';

interface FaqItem {
  question: string;
  answer: string;
}

export default function HelpScreen() {
  const theme = useTheme();
  const { t } = useTranslation();

  const faqs: FaqItem[] = t('help.faqs', { returnObjects: true }) as FaqItem[];

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Header
        title={t('help.title')}
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
        contentContainerStyle={{ padding: theme.spacing.lg, gap: theme.spacing.md }}
        showsVerticalScrollIndicator={false}
      >
        {faqs.map((faq) => (
          <Card key={faq.question}>
            <Text variant="headline" style={{ marginBottom: theme.spacing.xs }}>
              {faq.question}
            </Text>
            <Text variant="body" color="secondary">
              {faq.answer}
            </Text>
          </Card>
        ))}
      </ScrollView>
    </View>
  );
}
