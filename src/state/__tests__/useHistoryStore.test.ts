import AsyncStorage from '@react-native-async-storage/async-storage';

import { AnalysisResult } from '../../types/analysis';
import { useHistoryStore } from '../useHistoryStore';

function buildResult(id: string): AnalysisResult {
  return {
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
}

describe('useHistoryStore', () => {
  beforeEach(async () => {
    jest.restoreAllMocks();
    await AsyncStorage.clear();
    useHistoryStore.setState({ entries: [], status: 'idle', error: null });
  });

  describe('load', () => {
    it('loads persisted entries and sets status to ready', async () => {
      await useHistoryStore.getState().save(buildResult('a'));
      useHistoryStore.setState({ entries: [], status: 'idle', error: null });

      await useHistoryStore.getState().load();

      expect(useHistoryStore.getState().status).toBe('ready');
      expect(useHistoryStore.getState().entries.map((e) => e.result.id)).toEqual(['a']);
    });

    it('sets status to error and keeps a message when loading fails', async () => {
      jest.spyOn(AsyncStorage, 'getItem').mockRejectedValueOnce(new Error('boom'));

      await useHistoryStore.getState().load();

      expect(useHistoryStore.getState().status).toBe('error');
      expect(useHistoryStore.getState().error).toBeTruthy();
    });
  });

  describe('save', () => {
    it('returns true and adds the entry on success', async () => {
      const ok = await useHistoryStore.getState().save(buildResult('a'));

      expect(ok).toBe(true);
      expect(useHistoryStore.getState().entries.map((e) => e.result.id)).toEqual(['a']);
    });

    it('returns false and leaves entries untouched when persistence fails', async () => {
      jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(new Error('boom'));

      const ok = await useHistoryStore.getState().save(buildResult('a'));

      expect(ok).toBe(false);
      expect(useHistoryStore.getState().entries).toEqual([]);
    });
  });

  describe('setFeedback', () => {
    it('updates the feedback on an existing entry and returns true', async () => {
      await useHistoryStore.getState().save(buildResult('a'));

      const ok = await useHistoryStore.getState().setFeedback('a', 'helpful');

      expect(ok).toBe(true);
      expect(useHistoryStore.getState().entries[0].feedback).toBe('helpful');
    });

    it('returns false and leaves feedback untouched when persistence fails', async () => {
      await useHistoryStore.getState().save(buildResult('a'));
      jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(new Error('boom'));

      const ok = await useHistoryStore.getState().setFeedback('a', 'helpful');

      expect(ok).toBe(false);
      expect(useHistoryStore.getState().entries[0].feedback).toBeNull();
    });

    it('returns false for an analysis id that has no entry', async () => {
      const ok = await useHistoryStore.getState().setFeedback('missing', 'helpful');

      expect(ok).toBe(false);
    });
  });

  describe('remove', () => {
    it('removes the entry and returns true on success', async () => {
      await useHistoryStore.getState().save(buildResult('a'));

      const ok = await useHistoryStore.getState().remove('a');

      expect(ok).toBe(true);
      expect(useHistoryStore.getState().entries).toEqual([]);
    });

    it('keeps the entry and returns false when deletion fails', async () => {
      await useHistoryStore.getState().save(buildResult('a'));
      jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(new Error('boom'));

      const ok = await useHistoryStore.getState().remove('a');

      expect(ok).toBe(false);
      expect(useHistoryStore.getState().entries).toHaveLength(1);
    });
  });

  describe('clear', () => {
    it('clears all entries and returns true on success', async () => {
      await useHistoryStore.getState().save(buildResult('a'));

      const ok = await useHistoryStore.getState().clear();

      expect(ok).toBe(true);
      expect(useHistoryStore.getState().entries).toEqual([]);
    });

    it('keeps entries and returns false when clearing fails', async () => {
      await useHistoryStore.getState().save(buildResult('a'));
      jest.spyOn(AsyncStorage, 'removeItem').mockRejectedValueOnce(new Error('boom'));

      const ok = await useHistoryStore.getState().clear();

      expect(ok).toBe(false);
      expect(useHistoryStore.getState().entries).toHaveLength(1);
    });
  });
});
