import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import React from 'react';
import { Alert } from 'react-native';

import '../../src/i18n';
import CameraScreen from '../camera';
import { pickImageFromGallery } from '../../src/services/media/pickImageFromGallery';
import { useAnalysisSessionStore } from '../../src/state/useAnalysisSessionStore';
import { ThemeProvider } from '../../src/theme';

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), push: jest.fn(), replace: jest.fn() },
  Stack: { Screen: () => null },
}));

jest.mock('../../src/services/media/pickImageFromGallery', () => ({
  pickImageFromGallery: jest.fn(),
}));

const mockCanRunAnalysis = jest.fn();
jest.mock('../../src/services/entitlements/EntitlementsService', () => ({
  entitlementsService: {
    canRunAnalysis: (...args: unknown[]) => mockCanRunAnalysis(...args),
  },
}));

// MockAIService's real analyze() has a real ~1.4-2.3s delay — replace it so
// tests stay fast and don't leave a pending timer behind.
const mockAnalyze = jest.fn().mockResolvedValue(undefined);
jest.mock('../../src/services/ai', () => ({
  createAIService: () => ({ analyze: (...args: unknown[]) => mockAnalyze(...args) }),
}));

let mockPermission: { granted: boolean } | null = { granted: true };
const mockRequestPermission = jest.fn();
const mockTakePictureAsync = jest.fn();

jest.mock('expo-camera', () => {
  const ReactActual = jest.requireActual('react');
  return {
    CameraView: ReactActual.forwardRef((_props: unknown, ref: React.Ref<unknown>) => {
      ReactActual.useImperativeHandle(ref, () => ({
        takePictureAsync: mockTakePictureAsync,
      }));
      return null;
    }),
    useCameraPermissions: () => [mockPermission, mockRequestPermission],
  };
});

function renderCamera() {
  return render(
    <ThemeProvider>
      <CameraScreen />
    </ThemeProvider>,
  );
}

async function captureAndReachPreview() {
  mockTakePictureAsync.mockResolvedValue({ uri: 'file://captured.jpg' });
  renderCamera();
  fireEvent.press(screen.getByLabelText('Tap to take the photo'));
  await waitFor(() => {
    expect(screen.getByText('Use this photo')).toBeTruthy();
  });
}

describe('CameraScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPermission = { granted: true };
    useAnalysisSessionStore.setState({
      status: 'idle',
      result: null,
      errorCode: null,
      startCategory: null,
    });
  });

  describe('camera permission denied', () => {
    it('shows the permission screen and lets the user request access or cancel', () => {
      mockPermission = { granted: false };
      renderCamera();

      expect(screen.getByText('We need camera access')).toBeTruthy();

      fireEvent.press(screen.getByText('Allow access'));
      expect(mockRequestPermission).toHaveBeenCalledTimes(1);

      fireEvent.press(screen.getByText('Cancel'));
      expect(router.back).toHaveBeenCalledTimes(1);
    });
  });

  describe('capture -> preview -> confirm', () => {
    it('shows a preview after capturing a photo', async () => {
      await captureAndReachPreview();

      expect(screen.getByLabelText('Photo you took of the problem')).toBeTruthy();
    });

    it('confirms and starts an analysis when under the daily limit', async () => {
      mockCanRunAnalysis.mockResolvedValue(true);
      await captureAndReachPreview();

      fireEvent.press(screen.getByText('Use this photo'));

      await waitFor(() => {
        expect(router.replace).toHaveBeenCalledWith('/result');
      });
      await waitFor(() => {
        expect(mockAnalyze).toHaveBeenCalledWith(
          expect.objectContaining({ imageUri: 'file://captured.jpg' }),
        );
      });
    });

    it('does not confirm or navigate when the daily limit is reached', async () => {
      mockCanRunAnalysis.mockResolvedValue(false);
      await captureAndReachPreview();

      fireEvent.press(screen.getByText('Use this photo'));

      await waitFor(() => {
        expect(mockCanRunAnalysis).toHaveBeenCalled();
      });
      expect(router.replace).not.toHaveBeenCalled();
      expect(mockAnalyze).not.toHaveBeenCalled();
    });

    it('shows an alert when the capture itself fails', async () => {
      const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
      mockTakePictureAsync.mockRejectedValue(new Error('hardware error'));
      renderCamera();

      fireEvent.press(screen.getByLabelText('Tap to take the photo'));

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalled();
      });
      expect(screen.queryByText('Use this photo')).toBeNull();
    });

    it('lets the user retake the photo, returning to the live camera view', async () => {
      await captureAndReachPreview();

      fireEvent.press(screen.getByText('Retake'));

      await waitFor(() => {
        expect(screen.getByLabelText('Tap to take the photo')).toBeTruthy();
      });
      expect(screen.queryByText('Use this photo')).toBeNull();
    });
  });

  describe('gallery picker inside Camera', () => {
    it('shows a preview when a gallery image is picked successfully', async () => {
      (pickImageFromGallery as jest.Mock).mockResolvedValue({ status: 'picked', uri: 'file://gallery.jpg' });
      renderCamera();

      fireEvent.press(screen.getByLabelText('Choose from gallery'));

      await waitFor(() => {
        expect(screen.getByText('Use this photo')).toBeTruthy();
      });
    });

    it('alerts on a denied gallery permission and stays on the live camera view', async () => {
      (pickImageFromGallery as jest.Mock).mockResolvedValue({ status: 'permission_denied' });
      const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
      renderCamera();

      fireEvent.press(screen.getByLabelText('Choose from gallery'));

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith(
          'Something went wrong',
          'To photograph your problem, Resolia needs permission to use the camera.',
        );
      });
      expect(screen.queryByText('Use this photo')).toBeNull();
    });

    it('alerts on an unexpected gallery error', async () => {
      (pickImageFromGallery as jest.Mock).mockResolvedValue({ status: 'error' });
      const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
      renderCamera();

      fireEvent.press(screen.getByLabelText('Choose from gallery'));

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith('Something went wrong', "We couldn't open the gallery. Please try again.");
      });
    });
  });
});
