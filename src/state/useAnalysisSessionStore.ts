import { create } from 'zustand';

import { createAIService } from '../services/ai';
import { entitlementsService } from '../services/entitlements/EntitlementsService';
import { AnalysisRequest, AnalysisResult, ProblemCategory } from '../types/analysis';
import { AnalysisErrorCode, ClientAnalysisError } from '../types/analysisError';

const aiService = createAIService();

type SessionStatus = 'idle' | 'analyzing' | 'ready' | 'error';

interface AnalysisSessionState {
  status: SessionStatus;
  result: AnalysisResult | null;
  errorCode: AnalysisErrorCode | null;
  startCategory: ProblemCategory | null;
  /** The request behind the current/last `runAnalysis` call — the only
   * thing `retryLastAnalysis` needs to safely repeat it. Never set by
   * `showResult`, so viewing a saved history entry can't leave a stale
   * request around for a retry to replay. */
  lastRequest: AnalysisRequest | null;

  setStartCategory: (category: ProblemCategory | null) => void;
  runAnalysis: (request: AnalysisRequest) => Promise<void>;
  retryLastAnalysis: () => Promise<void>;
  showResult: (result: AnalysisResult) => void;
  reset: () => void;
}

/**
 * Holds the in-flight/most-recent analysis so the camera -> analyzing ->
 * result screens can share it without serializing an image + full result
 * through router params.
 *
 * Daily usage is recorded here, in the one place a *new* analysis actually
 * completes — never in the Result screen itself. `showResult` (used when
 * reopening a saved entry from History) never touches usage, so viewing a
 * past result — once or repeatedly — never counts against the daily limit.
 */
export const useAnalysisSessionStore = create<AnalysisSessionState>((set, get) => ({
  status: 'idle',
  result: null,
  errorCode: null,
  startCategory: null,
  lastRequest: null,

  setStartCategory: (category) => set({ startCategory: category }),

  runAnalysis: async (request) => {
    set({ status: 'analyzing', errorCode: null, result: null, lastRequest: request });
    try {
      const result = await aiService.analyze(request);
      set({ status: 'ready', result });
      void entitlementsService.recordAnalysisUsed();
    } catch (error) {
      const code = error instanceof ClientAnalysisError ? error.code : 'UNKNOWN';
      set({ status: 'error', errorCode: code });
    }
  },

  retryLastAnalysis: async () => {
    const { lastRequest, runAnalysis } = get();
    if (!lastRequest) return;
    await runAnalysis(lastRequest);
  },

  showResult: (result) => set({ status: 'ready', result, errorCode: null }),

  reset: () =>
    set({ status: 'idle', result: null, errorCode: null, startCategory: null, lastRequest: null }),
}));
