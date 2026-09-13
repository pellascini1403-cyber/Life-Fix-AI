import { render, screen } from '@testing-library/react-native';
import React from 'react';

import '../../src/i18n';
import NotFoundScreen from '../+not-found';
import { ThemeProvider } from '../../src/theme';

jest.mock('expo-router', () => {
  const ReactActual = jest.requireActual('react');
  return {
    Stack: { Screen: () => null },
    Link: ({ children }: { children?: React.ReactNode; href: string }) =>
      ReactActual.createElement(ReactActual.Fragment, null, children),
  };
});

describe('NotFoundScreen', () => {
  it('renders fully translated copy, with no hardcoded strings left', () => {
    render(
      <ThemeProvider>
        <NotFoundScreen />
      </ThemeProvider>,
    );

    expect(screen.getByText("This screen doesn't exist.")).toBeTruthy();
    expect(screen.getByText('Go to Home')).toBeTruthy();
  });
});
