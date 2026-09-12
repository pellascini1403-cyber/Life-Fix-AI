import { AnalyzeRequestFieldsSchema, ProviderAnalysisSchema } from '../schema';

function validProviderAnalysis() {
  return {
    category: 'home' as const,
    problem: 'Damp patch on the wall',
    confidence: 'medium' as const,
    explanation: 'A localized damp patch is visible, no obvious mold growth.',
    steps: [{ number: 1, title: 'Ventilate', description: 'Air out the room daily.' }],
    materials: ['Dry cloth'],
    estimatedTimeMinutes: { min: 10, max: 15 },
    difficulty: 'easy' as const,
    warnings: ['Consult a professional if it spreads quickly.'],
    thingsToAvoid: ['Do not paint over it without fixing the source.'],
    followUpQuestions: [],
    safetyLevel: 'safe' as const,
  };
}

describe('ProviderAnalysisSchema (AI provider structured output validation)', () => {
  it('accepts a well-formed provider response', () => {
    const result = ProviderAnalysisSchema.safeParse(validProviderAnalysis());
    expect(result.success).toBe(true);
  });

  it('rejects an unknown category', () => {
    const result = ProviderAnalysisSchema.safeParse({ ...validProviderAnalysis(), category: 'spaceship' });
    expect(result.success).toBe(false);
  });

  it('rejects an unknown safetyLevel', () => {
    const result = ProviderAnalysisSchema.safeParse({ ...validProviderAnalysis(), safetyLevel: 'yolo' });
    expect(result.success).toBe(false);
  });

  it('rejects a missing required field', () => {
    const { problem: _problem, ...withoutProblem } = validProviderAnalysis();
    const result = ProviderAnalysisSchema.safeParse(withoutProblem);
    expect(result.success).toBe(false);
  });

  it('rejects a negative estimated time', () => {
    const result = ProviderAnalysisSchema.safeParse({
      ...validProviderAnalysis(),
      estimatedTimeMinutes: { min: -5, max: 10 },
    });
    expect(result.success).toBe(false);
  });

  it('accepts a null estimated time (task too open-ended to estimate)', () => {
    const result = ProviderAnalysisSchema.safeParse({
      ...validProviderAnalysis(),
      estimatedTimeMinutes: null,
    });
    expect(result.success).toBe(true);
  });
});

describe('AnalyzeRequestFieldsSchema (incoming /analyze form fields)', () => {
  it('defaults locale to "es" when not provided', () => {
    const result = AnalyzeRequestFieldsSchema.parse({});
    expect(result.locale).toBe('es');
  });

  it('accepts a valid category and locale', () => {
    const result = AnalyzeRequestFieldsSchema.safeParse({ category: 'garden', locale: 'en' });
    expect(result.success).toBe(true);
  });

  it('rejects an invalid category', () => {
    const result = AnalyzeRequestFieldsSchema.safeParse({ category: 'not-a-real-category' });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid locale', () => {
    const result = AnalyzeRequestFieldsSchema.safeParse({ locale: 'fr' });
    expect(result.success).toBe(false);
  });

  it('rejects userContext over the length limit', () => {
    const result = AnalyzeRequestFieldsSchema.safeParse({ userContext: 'a'.repeat(501) });
    expect(result.success).toBe(false);
  });
});
