import { applySafetyPolicy } from '../safety/applySafetyPolicy';
import { AnalysisResult } from '../../src/types/analysis';

type Mapped = Omit<AnalysisResult, 'id' | 'createdAt' | 'imageUri' | 'userContext'>;

function buildMapped(overrides: Partial<Mapped> = {}): Mapped {
  return {
    category: 'home',
    problemTitle: 'Damp patch on the wall',
    problemExplanation: 'A small damp patch, no visible mold.',
    confidence: 'medium',
    steps: [{ order: 1, instruction: 'Ventilate the room daily.' }],
    requiredItems: [],
    estimatedTimeMinutes: { min: 10, max: 15 },
    difficulty: 'easy',
    warnings: [],
    followUpQuestions: [],
    risk: 'none',
    recommendsProfessional: false,
    ...overrides,
  };
}

describe('applySafetyPolicy', () => {
  it('leaves a genuinely safe result untouched', () => {
    const result = applySafetyPolicy(buildMapped(), 'en');
    expect(result.risk).toBe('none');
    expect(result.steps).toEqual([{ order: 1, instruction: 'Ventilate the room daily.' }]);
  });

  it('escalates risk when the keyword classifier finds danger the model marked "safe"', () => {
    // The model says "safe", but the problem text itself mentions a gas leak —
    // the backend must never trust the model's self-report alone.
    const mapped = buildMapped({
      risk: 'none',
      problemTitle: 'Fuga de gas en la cocina',
      problemExplanation: 'Se siente olor a gas cerca de la hornalla.',
    });
    const result = applySafetyPolicy(mapped, 'es');
    expect(result.risk).toBe('high');
  });

  it('never downgrades risk below what the model itself reported', () => {
    // The model says "professional" (mapped to risk 'high' upstream), but the
    // text is bland — the keyword pass alone would say 'none'. The more
    // severe signal must still win.
    const mapped = buildMapped({ risk: 'high', problemTitle: 'Wobbly shelf', problemExplanation: 'ok' });
    const result = applySafetyPolicy(mapped, 'en');
    expect(result.risk).toBe('high');
  });

  it('replaces steps and materials with a safe fallback at high risk', () => {
    const mapped = buildMapped({
      risk: 'high',
      steps: [{ order: 1, instruction: 'Rewire the breaker panel yourself.' }],
      requiredItems: ['Wire strippers'],
    });
    const result = applySafetyPolicy(mapped, 'en');
    expect(result.steps).toHaveLength(1);
    expect(result.steps[0].instruction).toMatch(/professional/i);
    expect(result.requiredItems).toEqual([]);
  });

  it('forces confidence to low and recommendsProfessional to true at high risk', () => {
    const mapped = buildMapped({ risk: 'high', confidence: 'high', recommendsProfessional: false });
    const result = applySafetyPolicy(mapped, 'en');
    expect(result.confidence).toBe('low');
    expect(result.recommendsProfessional).toBe(true);
  });

  it('localizes the safety fallback step in Spanish', () => {
    const mapped = buildMapped({ risk: 'high' });
    const result = applySafetyPolicy(mapped, 'es');
    expect(result.steps[0].instruction).toMatch(/profesional/i);
  });

  it('keeps steps but recommends a professional at medium risk', () => {
    const mapped = buildMapped({
      risk: 'medium',
      steps: [{ order: 1, instruction: 'Use gloves while handling the cleaning solution.' }],
    });
    const result = applySafetyPolicy(mapped, 'en');
    expect(result.risk).toBe('medium');
    expect(result.recommendsProfessional).toBe(true);
    expect(result.steps).toEqual([
      { order: 1, instruction: 'Use gloves while handling the cleaning solution.' },
    ]);
  });

  it('never touches problemTitle/problemExplanation even at high risk', () => {
    const mapped = buildMapped({
      risk: 'high',
      problemTitle: 'Exposed live wire',
      problemExplanation: 'A wire with visible copper is exposed near the outlet.',
    });
    const result = applySafetyPolicy(mapped, 'en');
    expect(result.problemTitle).toBe('Exposed live wire');
    expect(result.problemExplanation).toBe('A wire with visible copper is exposed near the outlet.');
  });
});
