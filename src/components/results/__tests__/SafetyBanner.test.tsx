import { render, screen } from '@testing-library/react-native';
import React from 'react';

import '../../../i18n';
import { ThemeProvider } from '../../../theme';
import { SafetyBanner } from '../SafetyBanner';

function renderBanner(risk: 'none' | 'low' | 'medium' | 'high') {
  return render(
    <ThemeProvider>
      <SafetyBanner risk={risk} />
    </ThemeProvider>,
  );
}

describe('SafetyBanner', () => {
  it('renders nothing for risk "none"', () => {
    const { toJSON } = renderBanner('none');

    expect(screen.queryByText('Safety notice')).toBeNull();
    expect(toJSON()).toBeNull();
  });

  it('renders nothing for risk "low"', () => {
    const { toJSON } = renderBanner('low');

    expect(screen.queryByText('Safety notice')).toBeNull();
    expect(toJSON()).toBeNull();
  });

  it('shows the medium-risk warning for risk "medium"', () => {
    renderBanner('medium');

    expect(screen.UNSAFE_getByProps({ accessibilityRole: 'alert' })).toBeTruthy();
    expect(screen.getByText('Safety notice')).toBeTruthy();
    expect(screen.getByText('Proceed with caution and follow the guidance carefully.')).toBeTruthy();
    expect(screen.queryByText('This problem may be dangerous. Consult a professional before acting.')).toBeNull();
  });

  it('shows the high-risk warning for risk "high"', () => {
    renderBanner('high');

    expect(screen.UNSAFE_getByProps({ accessibilityRole: 'alert' })).toBeTruthy();
    expect(screen.getByText('Safety notice')).toBeTruthy();
    expect(screen.getByText('This problem may be dangerous. Consult a professional before acting.')).toBeTruthy();
    expect(screen.queryByText('Proceed with caution and follow the guidance carefully.')).toBeNull();
  });
});
