import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import React from 'react';
import { Alert } from 'react-native';

import ProfileScreen from '../profile';
import { changeAndPersistLanguage, LANGUAGE_STORAGE_KEY } from '../../../src/i18n';
import { ThemeProvider } from '../../../src/theme';
import { Entitlements } from '../../../src/types/entitlements';

let capturedFocusCallback: (() => void) | undefined;

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() },
  useFocusEffect: (callback: () => void) => {
    const ReactActual = jest.requireActual('react');
    capturedFocusCallback = callback;
    // Runs the effect on mount, same as the real hook does for an
    // already-focused screen; tests re-invoke `capturedFocusCallback()`
    // directly to simulate the tab regaining focus later.
    ReactActual.useEffect(() => {
      callback();
    }, []);
  },
}));

const mockGetEntitlements = jest.fn();
jest.mock('../../../src/services/entitlements/EntitlementsService', () => ({
  entitlementsService: {
    getEntitlements: (...args: unknown[]) => mockGetEntitlements(...args),
  },
}));

function buildEntitlements(analysesUsedToday: number): Entitlements {
  return {
    plan: 'free',
    limits: { dailyAnalyses: 3, historyRetentionDays: 30, followUpQuestionsAllowed: false, adsEnabled: true },
    analysesUsedToday,
  };
}

function renderProfile() {
  return render(
    <ThemeProvider>
      <ProfileScreen />
    </ThemeProvider>,
  );
}

describe('ProfileScreen', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    capturedFocusCallback = undefined;
    await AsyncStorage.clear();
    // Reset before each test (rather than after) so this always runs once
    // the previous test's component has already been unmounted by
    // testing-library's own automatic cleanup, avoiding an act() warning
    // from a language-change event reaching a still-mounted screen.
    await changeAndPersistLanguage('en');
    mockGetEntitlements.mockResolvedValue(buildEntitlements(0));
  });

  describe('language', () => {
    it('toggles the language when the Language row is pressed', async () => {
      renderProfile();
      expect(screen.getByText('EN')).toBeTruthy();

      fireEvent.press(screen.getByText('Language'));

      await waitFor(() => {
        expect(screen.getByText('ES')).toBeTruthy();
      });
      // A translated string elsewhere on the same screen confirms the
      // whole screen re-rendered in the new language, not just the badge.
      expect(screen.getByText('Perfil')).toBeTruthy();
    });

    it('persists the chosen language to storage', async () => {
      renderProfile();

      fireEvent.press(screen.getByText('Language'));

      await waitFor(async () => {
        expect(await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('es');
      });
    });
  });

  describe('coming-soon actions', () => {
    it('shows "coming soon" when "Upgrade to PRO" is pressed', async () => {
      const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
      renderProfile();

      fireEvent.press(screen.getByText('Upgrade to PRO'));

      expect(alertSpy).toHaveBeenCalledWith(
        'Coming soon',
        "This feature isn't available yet. We're getting it ready for an upcoming update.",
      );
    });

    it('shows "coming soon" when "Notifications" is pressed', async () => {
      const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
      renderProfile();

      fireEvent.press(screen.getByText('Notifications'));

      expect(alertSpy).toHaveBeenCalledWith(
        'Coming soon',
        "This feature isn't available yet. We're getting it ready for an upcoming update.",
      );
    });
  });

  describe('navigation', () => {
    it('navigates to Help', () => {
      renderProfile();
      fireEvent.press(screen.getByText('Help'));
      expect(router.push).toHaveBeenCalledWith('/help');
    });

    it('navigates to About Resolia', () => {
      renderProfile();
      fireEvent.press(screen.getByText('About Resolia'));
      expect(router.push).toHaveBeenCalledWith('/about');
    });

    it('navigates to Privacy', () => {
      renderProfile();
      fireEvent.press(screen.getByText('Privacy'));
      expect(router.push).toHaveBeenCalledWith('/privacy');
    });
  });

  describe('daily analysis count', () => {
    it('shows the current free-analyses-left count on mount', async () => {
      renderProfile();

      await waitFor(() => {
        expect(screen.getByText('3 free analyses left today')).toBeTruthy();
      });
    });

    it('refreshes the count when the tab regains focus', async () => {
      mockGetEntitlements.mockResolvedValueOnce(buildEntitlements(0)).mockResolvedValueOnce(buildEntitlements(1));
      renderProfile();

      await waitFor(() => {
        expect(screen.getByText('3 free analyses left today')).toBeTruthy();
      });

      capturedFocusCallback?.();

      await waitFor(() => {
        expect(screen.getByText('2 free analyses left today')).toBeTruthy();
      });
      expect(mockGetEntitlements).toHaveBeenCalledTimes(2);
    });
  });
});
