import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../../theme';
import { Text } from './Text';

export interface HeaderProps {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}

/** Large-title screen header, consistent across top-level tabs. */
export function Header({ title, subtitle, right }: HeaderProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top + theme.spacing.sm,
          paddingHorizontal: theme.spacing.lg,
          paddingBottom: theme.spacing.sm,
        },
      ]}
    >
      <View style={styles.row}>
        <View style={styles.titleBlock}>
          <Text variant="title1">{title}</Text>
          {subtitle ? (
            <Text variant="callout" color="secondary" style={{ marginTop: 2 }}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {right}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  titleBlock: {
    flexShrink: 1,
  },
});
