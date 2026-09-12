import { create } from 'zustand';

import { createAIService } from '../services/ai';
import { AnalysisRequest, AnalysisResult, ProblemCategory } from '../types/analysis';

const aiService = createAIService();

type SessionStatus = 'idle' | 'analyzing' | 'ready' | 'error';

interface AnalysisSessionState {
  status: SessionStatus;
  result: AnalysisResult | null;
  error: string | null;
  startCategory: ProblemCategory | null;

  setStartCategory: (category: ProblemCategory | null) => void;
  runAnalysis: (request: AnalysisRequest) => Promise<void>;
  showResult: (result: AnalysisResult) => void;
  reset: () => void;
}

/**
 * Holds the in-flight/most-recent analysis so the camera -> analyzing ->
 * result screens can share it without serializing an image + full result
 * through router params.
 */
export const useAnalysisSessionStore = create<AnalysisSessionState>((set) => ({
  status: 'idle',
  result: null,
  error: null,
  startCategory: null,

  setStartCategory: (category) => set({ startCategory: category }),

  runAnalysis: async (request) => {
    set({ status: 'analyzing', error: null, result: null });
    try {
      const result = await aiService.analyze(request);
      set({ status: 'ready', result });
    } catch {
      set({ status: 'error', error: 'errors.analysisFailed' });
    }
  },

  showResult: (result) => set({ status: 'ready', result, error: null }),

  reset: () => set({ status: 'idle', result: null, error: null, startCategory: null }),
}));
