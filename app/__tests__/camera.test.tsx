import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import * as Linking from 'expo-linking';
import React from 'react';
import { Alert, AppState } from 'react-native';

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

jest.mock('expo-linking', () => ({
  openSettings: jest.fn(),
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

let mockPermission: { granted: boolean; canAskAgain: boolean } | null = {
  granted: true,
  canAskAgain: true,
};
const mockRequestPermission = jest.fn();
const mockGetCameraPermission = jest.fn();
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
    useCameraPermissions: () => [mockPermission, mockRequestPermission, mockGetCameraPermission],
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
    mockPermission = { granted: true, canAskAgain: true };
    useAnalysisSessionStore.setState({
      status: 'idle',
      result: null,
      errorCode: null,
      startCategory: null,
    });
  });

  describe('camera permission denied', () => {
    it('shows the permission screen and lets the user request access or cancel', () => {
      mockPermission = { granted: false, canAskAgain: true };
      renderCamera();

      expect(screen.getByText('We need camera access')).toBeTruthy();

      fireEvent.press(screen.getByText('Allow access'));
      expect(mockRequestPermission).toHaveBeenCalledTimes(1);

      fireEvent.press(screen.getByText('Cancel'));
      expect(router.back).toHaveBeenCalledTimes(1);
    });

    it('offers to open Settings instead of re-prompting once permission is permanently denied', () => {
      mockPermission = { granted: false, canAskAgain: false };
      renderCamera();

      expect(screen.getByText('We need this permission')).toBeTruthy();
      expect(
        screen.getByText(
          'You denied this permission and we can no longer ask for it from within the app. You can enable it manually from system Settings.',
        ),
      ).toBeTruthy();
      expect(screen.queryByText('Allow access')).toBeNull();

      fireEvent.press(screen.getByText('Open Settings'));
      expect(Linking.openSettings).toHaveBeenCalledTimes(1);
      expect(mockRequestPermission).not.toHaveBeenCalled();

      fireEvent.press(screen.getByText('Cancel'));
      expect(router.back).toHaveBeenCalledTimes(1);
    });

    it('re-checks camera permission when the app returns to foreground (e.g. from Settings)', () => {
      mockPermission = { granted: false, canAskAgain: true };
      const addEventListenerSpy = jest.spyOn(AppState, 'addEventListener');
      renderCamera();

      const changeHandler = addEventListenerSpy.mock.calls.find(([event]) => event === 'change')?.[1];
      expect(changeHandler).toBeDefined();

      changeHandler?.('active');

      expect(mockGetCameraPermission).toHaveBeenCalledTimes(1);
    });

    it('does not subscribe to app-state changes once permission is already granted', () => {
      mockPermission = { granted: true, canAskAgain: true };
      const addEventListenerSpy = jest.spyOn(AppState, 'addEventListener');
      renderCamera();

      expect(addEventListenerSpy).not.toHaveBeenCalledWith('change', expect.any(Function));
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

    it('ignores a second rapid tap on "Use this photo" while the first confirm is still in flight', async () => {
      let resolveCanRun!: (value: boolean) => void;
      mockCanRunAnalysis.mockReturnValue(
        new Promise<boolean>((resolve) => {
          resolveCanRun = resolve;
        }),
      );
      await captureAndReachPreview();

      const useButton = screen.getByText('Use this photo');
      fireEvent.press(useButton);
      fireEvent.press(useButton);

      resolveCanRun(true);
      await waitFor(() => {
        expect(router.replace).toHaveBeenCalledWith('/result');
      });
      expect(mockCanRunAnalysis).toHaveBeenCalledTimes(1);
      expect(router.replace).toHaveBeenCalledTimes(1);
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
      (pickImageFromGallery as jest.Mock).mockResolvedValue({
        status: 'permission_denied',
        canAskAgain: true,
      });
      const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
      renderCamera();

      fireEvent.press(screen.getByLabelText('Choose from gallery'));

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith(
          'Something went wrong',
          'To pick an image from your gallery, Resolia needs permission to access your photos.',
        );
      });
      expect(screen.queryByText('Use this photo')).toBeNull();
    });

    it('offers to open Settings when gallery permission is permanently denied', async () => {
      (pickImageFromGallery as jest.Mock).mockResolvedValue({
        status: 'permission_denied',
        canAskAgain: false,
      });
      const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => {
        const settingsButton = buttons?.find((b) => b.text === 'Open Settings');
        settingsButton?.onPress?.();
      });
      renderCamera();

      fireEvent.press(screen.getByLabelText('Choose from gallery'));

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith(
          'We need this permission',
          'You denied this permission and we can no longer ask for it from within the app. You can enable it manually from system Settings.',
          expect.any(Array),
        );
      });
      expect(Linking.openSettings).toHaveBeenCalledTimes(1);
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
