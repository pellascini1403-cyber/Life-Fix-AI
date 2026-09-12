import { create } from 'zustand';

import { historyRepository } from '../services/history/HistoryRepository';
import { AnalysisResult, HistoryEntry, SolutionFeedback } from '../types/analysis';

interface HistoryState {
  entries: HistoryEntry[];
  status: 'idle' | 'loading' | 'ready' | 'error';
  error: string | null;
  load: () => Promise<void>;
  save: (result: AnalysisResult) => Promise<void>;
  setFeedback: (analysisId: string, feedback: SolutionFeedback) => Promise<void>;
  remove: (analysisId: string) => Promise<void>;
  clear: () => Promise<void>;
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  entries: [],
  status: 'idle',
  error: null,

  load: async () => {
    set({ status: 'loading', error: null });
    try {
      const entries = await historyRepository.list();
      set({ entries, status: 'ready' });
    } catch {
      set({ status: 'error', error: 'history.loadError' });
    }
  },

  save: async (result) => {
    const entry: HistoryEntry = { result, feedback: null };
    await historyRepository.add(entry);
    set({ entries: [entry, ...get().entries.filter((e) => e.result.id !== result.id)] });
  },

  setFeedback: async (analysisId, feedback) => {
    const current = get().entries.find((e) => e.result.id === analysisId);
    if (!current) return;
    const updated: HistoryEntry = { ...current, feedback };
    await historyRepository.add(updated);
    set({
      entries: get().entries.map((e) => (e.result.id === analysisId ? updated : e)),
    });
  },

  remove: async (analysisId) => {
    await historyRepository.remove(analysisId);
    set({ entries: get().entries.filter((e) => e.result.id !== analysisId) });
  },

  clear: async () => {
    await historyRepository.clear();
    set({ entries: [] });
  },
}));
