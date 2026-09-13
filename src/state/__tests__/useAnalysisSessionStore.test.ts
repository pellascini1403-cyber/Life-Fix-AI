import { AnalysisResult } from '../../types/analysis';
import { ClientAnalysisError } from '../../types/analysisError';
import { useAnalysisSessionStore } from '../useAnalysisSessionStore';

const mockAnalyze = jest.fn();

// `createAIService()` is called once, at useAnalysisSessionStore's module
// load time — which (Jest/Babel hoist both `jest.mock()` calls and
// "mock"-prefixed const declarations above every import/require in this
// file) happens before this point textually, but after both of the above
// once hoisted. Forwarding through a closure instead of capturing `analyze:
// mockAnalyze` directly means the real mock function is looked up at call
// time, once it already exists, instead of being captured too early.
jest.mock('../../services/ai', () => ({
  createAIService: () => ({
    analyze: (...args: unknown[]) => mockAnalyze(...args),
  }),
}));

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

describe('useAnalysisSessionStore', () => {
  beforeEach(() => {
    mockAnalyze.mockReset();
    useAnalysisSessionStore.setState({
      status: 'idle',
      result: null,
      errorCode: null,
      startCategory: null,
    });
  });

  describe('setStartCategory', () => {
    it('sets and clears the start category', () => {
      useAnalysisSessionStore.getState().setStartCategory('repairs');
      expect(useAnalysisSessionStore.getState().startCategory).toBe('repairs');

      useAnalysisSessionStore.getState().setStartCategory(null);
      expect(useAnalysisSessionStore.getState().startCategory).toBeNull();
    });
  });

  describe('runAnalysis', () => {
    it('moves to the analyzing status immediately, clearing any previous result/error', async () => {
      useAnalysisSessionStore.setState({
        status: 'error',
        errorCode: 'UNKNOWN',
        result: buildResult('stale'),
      });
      let resolveAnalyze!: (value: AnalysisResult) => void;
      mockAnalyze.mockReturnValue(
        new Promise<AnalysisResult>((resolve) => {
          resolveAnalyze = resolve;
        }),
      );

      const promise = useAnalysisSessionStore.getState().runAnalysis({ imageUri: 'file://x.jpg' });

      expect(useAnalysisSessionStore.getState().status).toBe('analyzing');
      expect(useAnalysisSessionStore.getState().errorCode).toBeNull();
      expect(useAnalysisSessionStore.getState().result).toBeNull();

      resolveAnalyze(buildResult('a'));
      await promise;

      expect(useAnalysisSessionStore.getState().status).toBe('ready');
    });

    it('happy path: settles on ready with the resolved result', async () => {
      const result = buildResult('a');
      mockAnalyze.mockResolvedValue(result);

      await useAnalysisSessionStore.getState().runAnalysis({ imageUri: 'file://x.jpg' });

      expect(useAnalysisSessionStore.getState().status).toBe('ready');
      expect(useAnalysisSessionStore.getState().result).toEqual(result);
      expect(useAnalysisSessionStore.getState().errorCode).toBeNull();
    });

    it('passes the request through to the AI service unchanged', async () => {
      mockAnalyze.mockResolvedValue(buildResult('a'));
      const request = {
        imageUri: 'file://x.jpg',
        userContext: 'It smells odd',
        category: 'repairs' as const,
      };

      await useAnalysisSessionStore.getState().runAnalysis(request);

      expect(mockAnalyze).toHaveBeenCalledWith(request);
    });

    it.each(['INVALID_IMAGE', 'RATE_LIMITED', 'PROVIDER_UNAVAILABLE'] as const)(
      'maps a ClientAnalysisError with code %s onto status "error" and that errorCode',
      async (code) => {
        mockAnalyze.mockRejectedValue(new ClientAnalysisError(code, 'boom'));

        await useAnalysisSessionStore.getState().runAnalysis({ imageUri: 'file://x.jpg' });

        expect(useAnalysisSessionStore.getState().status).toBe('error');
        expect(useAnalysisSessionStore.getState().errorCode).toBe(code);
        expect(useAnalysisSessionStore.getState().result).toBeNull();
      },
    );

    it('falls back to the UNKNOWN error code for a plain, non-ClientAnalysisError throw', async () => {
      mockAnalyze.mockRejectedValue(new Error('something unexpected'));

      await useAnalysisSessionStore.getState().runAnalysis({ imageUri: 'file://x.jpg' });

      expect(useAnalysisSessionStore.getState().status).toBe('error');
      expect(useAnalysisSessionStore.getState().errorCode).toBe('UNKNOWN');
    });
  });

  describe('showResult', () => {
    it('sets the result directly, marks ready, and clears any previous error', () => {
      useAnalysisSessionStore.setState({ status: 'error', errorCode: 'TIMEOUT' });
      const result = buildResult('a');

      useAnalysisSessionStore.getState().showResult(result);

      const state = useAnalysisSessionStore.getState();
      expect(state.status).toBe('ready');
      expect(state.result).toEqual(result);
      expect(state.errorCode).toBeNull();
    });
  });

  describe('reset', () => {
    it('clears status, result, error code, and start category back to their initial values', () => {
      useAnalysisSessionStore.setState({
        status: 'ready',
        result: buildResult('a'),
        errorCode: 'UNKNOWN',
        startCategory: 'garden',
      });

      useAnalysisSessionStore.getState().reset();

      const state = useAnalysisSessionStore.getState();
      expect(state.status).toBe('idle');
      expect(state.result).toBeNull();
      expect(state.errorCode).toBeNull();
      expect(state.startCategory).toBeNull();
    });
  });
});
