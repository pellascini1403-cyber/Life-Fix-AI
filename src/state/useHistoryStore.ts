import { create } from 'zustand';

import { historyRepository } from '../services/history/HistoryRepository';
import { AnalysisResult, HistoryEntry, SolutionFeedback } from '../types/analysis';

interface HistoryState {
  entries: HistoryEntry[];
  status: 'idle' | 'loading' | 'ready' | 'error';
  error: string | null;
  load: () => Promise<void>;
  save: (result: AnalysisResult, feedback?: SolutionFeedback | null) => Promise<boolean>;
  setFeedback: (analysisId: string, feedback: SolutionFeedback) => Promise<boolean>;
  remove: (analysisId: string) => Promise<boolean>;
  clear: () => Promise<boolean>;
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
      set({ status: 'error', error: 'history.loadErrorBody' });
    }
  },
  save: async (result, feedback = null) => {
    const entry: HistoryEntry = { result, feedback };
    try {
      await historyRepository.add(entry);
      set({ entries: [entry, ...get().entries.filter((e) => e.result.id !== result.id)] });
      return true;
    } catch {
      return false;
    }
  },
  setFeedback: async (analysisId, feedback) => {
    const current = get().entries.find((e) => e.result.id === analysisId);
    if (!current) return false;
    const updated: HistoryEntry = { ...current, feedback };
    try {
      await historyRepository.add(updated);
      set({ entries: get().entries.map((e) => (e.result.id === analysisId ? updated : e)) });
      return true;
    } catch {
      return false;
    }
  },
  remove: async (analysisId) => {
    try {
      await historyRepository.remove(analysisId);
      set({ entries: get().entries.filter((e) => e.result.id !== analysisId) });
      return true;
    } catch {
      return false;
    }
  },
  clear: async () => {
    try {
      await historyRepository.clear();
      set({ entries: [] });
      return true;
    } catch {
      return false;
    }
  },
}));
