import { render, screen } from '@testing-library/react-native';
import React from 'react';

import '../../src/i18n';
import RootLayout, { ErrorBoundary } from '../_layout';
import { AppErrorBoundary } from '../../src/components/AppErrorBoundary';

// `useFonts` goes through expo-font's `FontLoader`, which imports
// `expo-asset` without declaring it as a dependency (see Phase 5.75) —
// mocked here the same way `@expo/vector-icons` is mocked project-wide.
jest.mock('expo-font', () => ({
  useFonts: jest.fn(() => [true]),
}));

// `Stack`/`Stack.Screen` resolve real routes from the file-based router
// context, which only exists inside a full `ExpoRoot` — replace them with
// inert stand-ins so this smoke test can mount RootLayout's own wrapper
// chain (fonts gate, providers, ErrorBoundary export) in isolation.
jest.mock('expo-router', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  function Stack({ children }: { children?: React.ReactNode }) {
    return ReactActual.createElement(View, { testID: 'stack' }, children);
  }
  Stack.Screen = ({ name }: { name: string }) =>
    ReactActual.createElement(View, { testID: `stack-screen-${name}` });
  return { Stack };
});

describe('RootLayout (app boot smoke test)', () => {
  it('mounts without crashing once fonts are loaded', () => {
    renderRootLayout();
    expect(screen.getByTestId('stack')).toBeTruthy();
  });

  it('registers every top-level route on the root Stack', () => {
    renderRootLayout();

    expect(screen.getByTestId('stack-screen-(tabs)')).toBeTruthy();
    expect(screen.getByTestId('stack-screen-camera')).toBeTruthy();
    expect(screen.getByTestId('stack-screen-result')).toBeTruthy();
    expect(screen.getByTestId('stack-screen-about')).toBeTruthy();
    expect(screen.getByTestId('stack-screen-privacy')).toBeTruthy();
    expect(screen.getByTestId('stack-screen-help')).toBeTruthy();
  });

  it('keeps the ErrorBoundary wired per Expo Router convention', () => {
    // This is exactly what makes it effective: Expo Router only picks up
    // an app-wide error boundary if the root layout exports a component
    // named `ErrorBoundary`. Renaming or dropping this export would silently
    // disable the whole feature without breaking anything else — this test
    // is the regression guard for that.
    expect(ErrorBoundary).toBe(AppErrorBoundary);
  });
});

function renderRootLayout() {
  return render(<RootLayout />);
}
