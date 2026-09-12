import AsyncStorage from '@react-native-async-storage/async-storage';

import { AnalysisResult, HistoryEntry } from '../../../types/analysis';
import { AsyncStorageHistoryRepository } from '../HistoryRepository';

function buildEntry(id: string, createdAt: string): HistoryEntry {
  const result: AnalysisResult = {
    id,
    createdAt,
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

describe('AsyncStorageHistoryRepository', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('starts empty', async () => {
    const repo = new AsyncStorageHistoryRepository();
    expect(await repo.list()).toEqual([]);
  });

  it('adds entries and lists them newest first', async () => {
    const repo = new AsyncStorageHistoryRepository();
    await repo.add(buildEntry('a', '2026-01-01T00:00:00.000Z'));
    await repo.add(buildEntry('b', '2026-01-02T00:00:00.000Z'));

    const list = await repo.list();
    expect(list.map((e) => e.result.id)).toEqual(['b', 'a']);
  });

  it('removes an entry by id', async () => {
    const repo = new AsyncStorageHistoryRepository();
    await repo.add(buildEntry('a', '2026-01-01T00:00:00.000Z'));
    await repo.add(buildEntry('b', '2026-01-02T00:00:00.000Z'));

    await repo.remove('a');

    const list = await repo.list();
    expect(list.map((e) => e.result.id)).toEqual(['b']);
  });

  it('clears all entries', async () => {
    const repo = new AsyncStorageHistoryRepository();
    await repo.add(buildEntry('a', '2026-01-01T00:00:00.000Z'));

    await repo.clear();

    expect(await repo.list()).toEqual([]);
  });
});
