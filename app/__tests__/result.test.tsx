import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import * as Speech from 'expo-speech';
import React from 'react';
import { Alert } from 'react-native';

import '../../src/i18n';
import ResultScreen from '../result';
import { useAnalysisSessionStore } from '../../src/state/useAnalysisSessionStore';
import { useHistoryStore } from '../../src/state/useHistoryStore';
import { ThemeProvider } from '../../src/theme';
import { AnalysisResult } from '../../src/types/analysis';

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), push: jest.fn(), replace: jest.fn() },
}));

jest.mock('expo-speech', () => ({
  stop: jest.fn().mockResolvedValue(undefined),
  speak: jest.fn(),
}));

// ResultScreen records daily usage on mount (already covered by
// EntitlementsService's own tests); stub it out so its own AsyncStorage
// write can't race with the save/feedback writes these tests assert on.
jest.mock('../../src/services/entitlements/EntitlementsService', () => ({
  entitlementsService: { recordAnalysisUsed: jest.fn().mockResolvedValue(undefined) },
}));

function buildResult(id: string): AnalysisResult {
  return {
    id,
    createdAt: '2026-01-01T00:00:00.000Z',
    category: 'home',
    problemTitle: 'Damp patch on the wall',
    problemExplanation: 'Explanation',
    confidence: 'high',
    steps: [{ order: 1, instruction: 'Ventilate the room.' }],
    requiredItems: [],
    estimatedTimeMinutes: { min: 10, max: 15 },
    difficulty: 'easy',
    warnings: [],
    followUpQuestions: [],
    risk: 'none',
    recommendsProfessional: false,
    imageUri: null,
    userContext: null,
  };
}

function renderResultScreen() {
  return render(
    <ThemeProvider>
      <ResultScreen />
    </ThemeProvider>,
  );
}

describe('ResultScreen', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    useAnalysisSessionStore.setState({
      status: 'ready',
      result: buildResult('r1'),
      errorCode: null,
      startCategory: null,
    });
    useHistoryStore.setState({ entries: [], status: 'idle', error: null });
  });

  it('saves the analysis to history when "Save to history" is pressed', async () => {
    renderResultScreen();

    fireEvent.press(screen.getByText('Save to history'));

    await waitFor(() => {
      expect(useHistoryStore.getState().entries.map((e) => e.result.id)).toEqual(['r1']);
    });
  });

  it('shows an alert and does not mark it saved when persisting fails', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(new Error('disk full'));

    renderResultScreen();
    fireEvent.press(screen.getByText('Save to history'));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalled();
    });
    expect(useHistoryStore.getState().entries).toEqual([]);
    expect(screen.getByText('Save to history')).toBeTruthy();
  });

  it('persists feedback through useHistoryStore once the result is already saved', async () => {
    renderResultScreen();

    fireEvent.press(screen.getByText('Save to history'));
    await waitFor(() => {
      expect(useHistoryStore.getState().entries).toHaveLength(1);
    });

    fireEvent.press(screen.getByText('Yes'));

    await waitFor(() => {
      expect(useHistoryStore.getState().entries[0].feedback).toBe('helpful');
    });
  });

  it('does not persist feedback yet when the result has not been saved', async () => {
    renderResultScreen();

    fireEvent.press(screen.getByText('Yes'));

    // No entry exists to attach feedback to; nothing should be written.
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(useHistoryStore.getState().entries).toEqual([]);
  });

  it('shows an alert when persisting feedback fails', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    renderResultScreen();

    fireEvent.press(screen.getByText('Save to history'));
    await waitFor(() => {
      expect(useHistoryStore.getState().entries).toHaveLength(1);
    });

    jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(new Error('disk full'));
    fireEvent.press(screen.getByText('Yes'));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Something went wrong', "We couldn't save your feedback. Please try again.");
    });
    expect(useHistoryStore.getState().entries[0].feedback).toBeNull();
  });

  describe('close', () => {
    it('stops any speech, resets the session, and navigates back', () => {
      renderResultScreen();

      fireEvent.press(screen.getByLabelText('Close'));

      expect(Speech.stop).toHaveBeenCalled();
      expect(useAnalysisSessionStore.getState().status).toBe('idle');
      expect(useAnalysisSessionStore.getState().result).toBeNull();
      expect(router.back).toHaveBeenCalledTimes(1);
    });
  });

  describe('explain simpler', () => {
    it('toggles a simplified explanation on and back off', async () => {
      renderResultScreen();

      fireEvent.press(screen.getByText('Explain it simpler'));

      await waitFor(() => {
        expect(screen.getByText('Show original')).toBeTruthy();
      });

      fireEvent.press(screen.getByText('Show original'));

      await waitFor(() => {
        expect(screen.getByText('Explain it simpler')).toBeTruthy();
      });
    });
  });

  describe('listen to solution', () => {
    it('speaks the solution and toggles to a Stop control while active', () => {
      (Speech.speak as jest.Mock).mockImplementation((_text, options) => {
        options.onStart?.();
      });
      renderResultScreen();

      fireEvent.press(screen.getByText('Listen to solution'));

      expect(Speech.speak).toHaveBeenCalled();
      expect(screen.getByText('Stop')).toBeTruthy();

      fireEvent.press(screen.getByText('Stop'));

      expect(Speech.stop).toHaveBeenCalled();
    });

    it('shows a fallback message when speech is unavailable on the device', () => {
      (Speech.speak as jest.Mock).mockImplementation((_text, options) => {
        options.onError?.();
      });
      renderResultScreen();

      fireEvent.press(screen.getByText('Listen to solution'));

      expect(screen.getByText("We couldn't play audio on this device.")).toBeTruthy();
    });
  });

  describe('error state', () => {
    it('shows an ErrorState and lets the user close out of it', () => {
      useAnalysisSessionStore.setState({
        status: 'error',
        errorCode: 'TIMEOUT',
        result: null,
        startCategory: null,
      });
      renderResultScreen();

      expect(screen.getByText('Something went wrong')).toBeTruthy();

      fireEvent.press(screen.getByText('Close'));

      expect(router.back).toHaveBeenCalledTimes(1);
    });
  });
});
