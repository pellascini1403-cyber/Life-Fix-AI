import React, { useState } from 'react';
import { StyleSheet, TextInput, TextInputProps, View } from 'react-native';

import { useTheme } from '../../theme';
import { Text } from './Text';

export interface InputProps extends TextInputProps {
  label?: string;
  errorMessage?: string;
}

export function Input({ label, errorMessage, style, onFocus, onBlur, ...rest }: InputProps) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);

  const borderColor = errorMessage ? theme.colors.danger : focused ? theme.colors.accent : theme.colors.border;

  return (
    <View>
      {label ? (
        <Text variant="footnote" color="secondary" style={styles.label}>
          {label}
        </Text>
      ) : null}
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={theme.colors.textTertiary}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        style={[
          styles.input,
          {
            borderColor,
            borderRadius: theme.radii.md,
            color: theme.colors.textPrimary,
            backgroundColor: theme.colors.surface,
            paddingHorizontal: theme.spacing.sm,
          },
          theme.typography.body,
          style,
        ]}
        {...rest}
      />
      {errorMessage ? (
        <Text variant="footnote" color="danger" style={styles.error}>
          {errorMessage}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    marginBottom: 6,
  },
  input: {
    minHeight: 48,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  error: {
    marginTop: 4,
  },
});
