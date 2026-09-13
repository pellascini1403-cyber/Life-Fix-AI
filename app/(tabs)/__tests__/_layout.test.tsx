import { render, screen } from '@testing-library/react-native';
import React from 'react';

import '../../../src/i18n';
import TabsLayout from '../_layout';
import { ThemeProvider } from '../../../src/theme';

// `Tabs`/`Tabs.Screen` resolve real routes from the file-based router
// context, which only exists inside a full `ExpoRoot` — replace them with
// an inert stand-in that just renders each screen's resolved title, so
// this smoke test can confirm the three tabs are registered without
// needing a full navigator.
jest.mock('expo-router', () => {
  const ReactActual = jest.requireActual('react');
  const { Text } = jest.requireActual('react-native');
  function Tabs({ children }: { children?: React.ReactNode }) {
    return ReactActual.createElement(ReactActual.Fragment, null, children);
  }
  Tabs.Screen = ({ name, options }: { name: string; options?: { title?: string } }) =>
    ReactActual.createElement(Text, { testID: `tab-${name}` }, options?.title ?? name);
  return { Tabs };
});

function renderTabsLayout() {
  return render(
    <ThemeProvider>
      <TabsLayout />
    </ThemeProvider>,
  );
}

describe('TabsLayout (app boot smoke test)', () => {
  it('mounts without crashing and registers exactly the three main tabs', () => {
    renderTabsLayout();

    expect(screen.getByTestId('tab-index')).toBeTruthy();
    expect(screen.getByTestId('tab-history')).toBeTruthy();
    expect(screen.getByTestId('tab-profile')).toBeTruthy();
  });

  it('gives each tab its translated title', () => {
    renderTabsLayout();

    expect(screen.getByText('Home')).toBeTruthy();
    expect(screen.getByText('History')).toBeTruthy();
    expect(screen.getByText('Profile')).toBeTruthy();
  });
});
