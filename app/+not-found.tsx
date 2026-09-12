import { Link, Stack } from 'expo-router';
import React from 'react';
import { View } from 'react-native';

import { Text } from '../src/components/ui';
import { useTheme } from '../src/theme';

export default function NotFoundScreen() {
  const theme = useTheme();

  return (
    <>
      <Stack.Screen options={{ title: 'Oops' }} />
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          backgroundColor: theme.colors.background,
        }}
      >
        <Text variant="title2">Esta pantalla no existe.</Text>
        <Link href="/" style={{ marginTop: 16 }}>
          <Text variant="body" color="accent">
            Volver al inicio
          </Text>
        </Link>
      </View>
    </>
  );
}
