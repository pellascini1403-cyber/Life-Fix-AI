import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React from 'react';
import { Alert } from 'react-native';

import '../../../src/i18n';
import HistoryScreen from '../history';
import { historyRepository } from '../../../src/services/history/HistoryRepository';
import { useHistoryStore } from '../../../src/state/useHistoryStore';
import { ThemeProvider } from '../../../src/theme';
import { AnalysisResult, HistoryEntry } from '../../../src/types/analysis';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() },
}));

function buildEntry(id: string): HistoryEntry {
  const result: AnalysisResult = {
    id,
    createdAt: '2026-01-01T00:00:00.000Z',
    category: 'home',
    problemTitle: `Problem ${id}`,
    problemExplanation: 'Explanation',
    confidence: 'high',
    steps: [],
    requiredItems: [],
    estimatedTimeMinutes: null,
    difficulty: 'easy',
    warnings: [],
    followUpQuestions: [],
    risk: 'none',
    recommendsProfessional: false,
    imageUri: null,
    userContext: null,
  };
  return { result, feedback: null };
}

function confirmDestructiveAlerts() {
  return jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => {
    buttons?.find((b) => b.style === 'destructive')?.onPress?.();
  });
}

function renderHistory() {
  return render(
    <ThemeProvider>
      <HistoryScreen />
    </ThemeProvider>,
  );
}

describe('HistoryScreen', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    useHistoryStore.setState({ entries: [], status: 'idle', error: null });
  });

  it('renders the empty state when there is no saved history', async () => {
    renderHistory();

    await waitFor(() => {
      expect(screen.getByText('No analyses yet')).toBeTruthy();
    });
  });

  it('shows an error state with retry when loading fails, and retry recovers', async () => {
    jest.spyOn(AsyncStorage, 'getItem').mockRejectedValueOnce(new Error('boom'));
    renderHistory();

    await waitFor(() => {
      expect(screen.getByText('Something went wrong')).toBeTruthy();
    });

    fireEvent.press(screen.getByText('Retry'));

    await waitFor(() => {
      expect(screen.getByText('No analyses yet')).toBeTruthy();
    });
  });

  it('shows "Clear history" only once there are entries, and clears them all on confirm', async () => {
    await historyRepository.add(buildEntry('a'));
    confirmDestructiveAlerts();

    renderHistory();

    await waitFor(() => {
      expect(screen.getByText('Problem a')).toBeTruthy();
    });
    expect(screen.getByText('Clear history')).toBeTruthy();

    fireEvent.press(screen.getByText('Clear history'));

    await waitFor(() => {
      expect(screen.getByText('No analyses yet')).toBeTruthy();
    });
  });

  it('deletes a single entry via its delete button, leaving the rest', async () => {
    await historyRepository.add(buildEntry('a'));
    await historyRepository.add(buildEntry('b'));
    confirmDestructiveAlerts();

    renderHistory();

    await waitFor(() => {
      expect(screen.getByText('Problem b')).toBeTruthy();
    });

    fireEvent.press(screen.getAllByLabelText('Delete')[0]);

    await waitFor(() => {
      expect(useHistoryStore.getState().entries).toHaveLength(1);
    });
  });

  it('shows an alert and keeps the entry when clearing history fails', async () => {
    await historyRepository.add(buildEntry('a'));
    const alertSpy = confirmDestructiveAlerts();

    renderHistory();
    await waitFor(() => {
      expect(screen.getByText('Clear history')).toBeTruthy();
    });

    jest.spyOn(AsyncStorage, 'removeItem').mockRejectedValueOnce(new Error('boom'));
    fireEvent.press(screen.getByText('Clear history'));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledTimes(2);
    });
    expect(useHistoryStore.getState().entries).toHaveLength(1);
  });
});
