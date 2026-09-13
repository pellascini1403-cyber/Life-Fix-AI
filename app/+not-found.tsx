import { Link, Stack } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Text } from '../src/components/ui';
import { useTheme } from '../src/theme';

export default function NotFoundScreen() {
  const theme = useTheme();
  const { t } = useTranslation();

  return (
    <>
      <Stack.Screen options={{ title: t('notFound.title') }} />
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          backgroundColor: theme.colors.background,
        }}
      >
        <Text variant="title2">{t('notFound.message')}</Text>
        <Link href="/" style={{ marginTop: 16 }}>
          <Text variant="body" color="accent">
            {t('notFound.goHome')}
          </Text>
        </Link>
      </View>
    </>
  );
}
