import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import * as Linking from 'expo-linking';
import React from 'react';
import { Alert } from 'react-native';

import '../../../src/i18n';
import HomeScreen from '../index';
import { pickImageFromGallery } from '../../../src/services/media/pickImageFromGallery';
import { useAnalysisSessionStore } from '../../../src/state/useAnalysisSessionStore';
import { ThemeProvider } from '../../../src/theme';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() },
}));

jest.mock('../../../src/services/media/pickImageFromGallery', () => ({
  pickImageFromGallery: jest.fn(),
}));

jest.mock('expo-linking', () => ({
  openSettings: jest.fn(),
}));

const mockCanRunAnalysis = jest.fn();
jest.mock('../../../src/services/entitlements/EntitlementsService', () => ({
  entitlementsService: {
    canRunAnalysis: (...args: unknown[]) => mockCanRunAnalysis(...args),
  },
}));

// MockAIService's real `analyze()` has a ~1.4-2.3s simulated delay — replace
// it so the "starts an analysis" test doesn't leave a real timer pending
// past the test (and doesn't need to wait on it either).
const mockAnalyze = jest.fn().mockResolvedValue(undefined);
jest.mock('../../../src/services/ai', () => ({
  createAIService: () => ({ analyze: (...args: unknown[]) => mockAnalyze(...args) }),
}));

function renderHome() {
  return render(
    <ThemeProvider>
      <HomeScreen />
    </ThemeProvider>,
  );
}

describe('HomeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAnalysisSessionStore.setState({
      status: 'idle',
      result: null,
      errorCode: null,
      startCategory: null,
    });
  });

  it('navigates to the camera when under the daily limit', async () => {
    mockCanRunAnalysis.mockResolvedValue(true);
    renderHome();

    fireEvent.press(screen.getByText('Analyze a problem'));

    await waitFor(() => {
      expect(router.push).toHaveBeenCalledWith('/camera');
    });
  });

  it('blocks camera navigation and alerts when the daily limit is reached', async () => {
    mockCanRunAnalysis.mockResolvedValue(false);
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    renderHome();

    fireEvent.press(screen.getByText('Analyze a problem'));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalled();
    });
    expect(router.push).not.toHaveBeenCalled();
  });

  it('sets the start category and navigates to the camera when a category is tapped', async () => {
    mockCanRunAnalysis.mockResolvedValue(true);
    renderHome();

    fireEvent.press(screen.getByText('Repairs'));

    await waitFor(() => {
      expect(router.push).toHaveBeenCalledWith('/camera');
    });
    expect(useAnalysisSessionStore.getState().startCategory).toBe('repairs');
  });

  it('does not navigate for a category tap when the daily limit is reached', async () => {
    mockCanRunAnalysis.mockResolvedValue(false);
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    renderHome();

    fireEvent.press(screen.getByText('Repairs'));

    await waitFor(() => {
      expect(mockCanRunAnalysis).toHaveBeenCalled();
    });
    expect(router.push).not.toHaveBeenCalled();
    expect(useAnalysisSessionStore.getState().startCategory).toBeNull();
  });

  it('starts an analysis from a picked gallery image when under the daily limit', async () => {
    mockCanRunAnalysis.mockResolvedValue(true);
    (pickImageFromGallery as jest.Mock).mockResolvedValue({ status: 'picked', uri: 'file://photo.jpg' });
    renderHome();

    fireEvent.press(screen.getByText('Choose from gallery'));

    await waitFor(() => {
      expect(router.push).toHaveBeenCalledWith('/result');
    });
    await waitFor(() => {
      expect(mockAnalyze).toHaveBeenCalledWith({ imageUri: 'file://photo.jpg' });
    });
  });

  it('alerts on a denied gallery permission instead of navigating', async () => {
    mockCanRunAnalysis.mockResolvedValue(true);
    (pickImageFromGallery as jest.Mock).mockResolvedValue({
      status: 'permission_denied',
      canAskAgain: true,
    });
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    renderHome();

    fireEvent.press(screen.getByText('Choose from gallery'));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        'Something went wrong',
        'To pick an image from your gallery, Resolia needs permission to access your photos.',
      );
    });
    expect(router.push).not.toHaveBeenCalled();
  });

  it('offers to open Settings when gallery permission is permanently denied', async () => {
    mockCanRunAnalysis.mockResolvedValue(true);
    (pickImageFromGallery as jest.Mock).mockResolvedValue({
      status: 'permission_denied',
      canAskAgain: false,
    });
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => {
      const settingsButton = buttons?.find((b) => b.text === 'Open Settings');
      settingsButton?.onPress?.();
    });
    renderHome();

    fireEvent.press(screen.getByText('Choose from gallery'));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        'We need this permission',
        'You denied this permission and we can no longer ask for it from within the app. You can enable it manually from system Settings.',
        expect.any(Array),
      );
    });
    expect(Linking.openSettings).toHaveBeenCalledTimes(1);
    expect(router.push).not.toHaveBeenCalled();
  });

  it('does not open the gallery at all when the daily limit is reached', async () => {
    mockCanRunAnalysis.mockResolvedValue(false);
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    renderHome();

    fireEvent.press(screen.getByText('Choose from gallery'));

    await waitFor(() => {
      expect(mockCanRunAnalysis).toHaveBeenCalled();
    });
    expect(pickImageFromGallery).not.toHaveBeenCalled();
  });
});
