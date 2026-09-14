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

// Daily usage is recorded by useAnalysisSessionStore.runAnalysis on a
// successful *new* analysis (covered by that store's own tests), and the
// daily-limit guard (used by the retry button) reads canRunAnalysis — stub
// both so this file's own AsyncStorage activity can't race with the
// save/feedback writes these tests assert on.
const mockCanRunAnalysis = jest.fn().mockResolvedValue(true);
const mockRecordAnalysisUsed = jest.fn().mockResolvedValue(undefined);
jest.mock('../../src/services/entitlements/EntitlementsService', () => ({
  entitlementsService: {
    recordAnalysisUsed: (...args: unknown[]) => mockRecordAnalysisUsed(...args),
    canRunAnalysis: (...args: unknown[]) => mockCanRunAnalysis(...args),
  },
}));

// A real retry goes through useAnalysisSessionStore.runAnalysis, which calls
// the real AIService — replace it so a retry test doesn't wait on
// MockAIService's ~1.4-2.3s simulated delay.
const mockAnalyze = jest.fn();
jest.mock('../../src/services/ai', () => ({
  createAIService: () => ({ analyze: (...args: unknown[]) => mockAnalyze(...args) }),
}));

const mockSimplify = jest
  .fn()
  .mockResolvedValue({ explanation: 'Simplified explanation', steps: ['Simplified step'] });
jest.mock('../../src/services/simplify', () => ({
  createSolutionSimplificationService: () => ({
    simplify: (...args: unknown[]) => mockSimplify(...args),
  }),
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
      lastRequest: null,
    });
    mockCanRunAnalysis.mockResolvedValue(true);
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

  describe('daily usage', () => {
    it('does not record a daily use just from showing an already-ready result (e.g. reopened from History)', async () => {
      // beforeEach already seeds status: 'ready' the same way History's
      // showResult() does, without ever calling runAnalysis — the exact
      // shape of the original double-count bug.
      renderResultScreen();

      // Give any stray effect a tick to fire before asserting its absence.
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(mockRecordAnalysisUsed).not.toHaveBeenCalled();
    });
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

    it('shows an alert and leaves the UI in a consistent state when simplifying fails', async () => {
      mockSimplify.mockRejectedValueOnce(new Error('boom'));
      const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
      renderResultScreen();

      fireEvent.press(screen.getByText('Explain it simpler'));

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith(
          'Something went wrong',
          "We couldn't simplify the explanation. Please try again.",
        );
      });
      // Not stuck on "Simplifying…", and still offering to try again rather
      // than being stuck showing "Show original" for content that never arrived.
      expect(screen.queryByText('Simplifying…')).toBeNull();
      expect(screen.getByText('Explain it simpler')).toBeTruthy();
      expect(screen.queryByText('Show original')).toBeNull();
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
        lastRequest: { imageUri: 'file://x.jpg' },
      });
      renderResultScreen();

      expect(screen.getByText('Something went wrong')).toBeTruthy();

      fireEvent.press(screen.getByText('Close'));

      expect(router.back).toHaveBeenCalledTimes(1);
    });

    it('actually re-runs the same analysis when Retry is pressed', async () => {
      const lastRequest = { imageUri: 'file://x.jpg', userContext: 'It smells odd' };
      useAnalysisSessionStore.setState({
        status: 'error',
        errorCode: 'TIMEOUT',
        result: null,
        startCategory: null,
        lastRequest,
      });
      mockAnalyze.mockResolvedValue(buildResult('retried'));
      renderResultScreen();

      fireEvent.press(screen.getByText('Retry'));

      await waitFor(() => {
        expect(mockAnalyze).toHaveBeenCalledWith(lastRequest);
      });
      await waitFor(() => {
        expect(useAnalysisSessionStore.getState().status).toBe('ready');
      });
      expect(useAnalysisSessionStore.getState().result?.id).toBe('retried');
    });

    it('ignores a second rapid tap on Retry while the first attempt is still in flight', async () => {
      let resolveCanRun!: (value: boolean) => void;
      mockCanRunAnalysis.mockReturnValue(
        new Promise<boolean>((resolve) => {
          resolveCanRun = resolve;
        }),
      );
      useAnalysisSessionStore.setState({
        status: 'error',
        errorCode: 'TIMEOUT',
        result: null,
        startCategory: null,
        lastRequest: { imageUri: 'file://x.jpg' },
      });
      mockAnalyze.mockResolvedValue(buildResult('retried'));
      renderResultScreen();

      const retryButton = screen.getByText('Retry');
      fireEvent.press(retryButton);
      fireEvent.press(retryButton);

      resolveCanRun(true);
      await waitFor(() => {
        expect(mockAnalyze).toHaveBeenCalledTimes(1);
      });
      expect(mockCanRunAnalysis).toHaveBeenCalledTimes(1);
    });

    it('does not retry, and shows the limit alert, when the daily limit is reached', async () => {
      mockCanRunAnalysis.mockResolvedValue(false);
      useAnalysisSessionStore.setState({
        status: 'error',
        errorCode: 'TIMEOUT',
        result: null,
        startCategory: null,
        lastRequest: { imageUri: 'file://x.jpg' },
      });
      renderResultScreen();

      fireEvent.press(screen.getByText('Retry'));

      await waitFor(() => {
        expect(mockCanRunAnalysis).toHaveBeenCalled();
      });
      expect(mockAnalyze).not.toHaveBeenCalled();
      expect(useAnalysisSessionStore.getState().status).toBe('error');
    });
  });
});
