import { LocalSolutionSimplificationService } from '../LocalSolutionSimplificationService';
import { AnalysisResult } from '../../../types/analysis';

function buildResult(overrides: Partial<AnalysisResult> = {}): AnalysisResult {
  return {
    id: '1',
    createdAt: '2026-01-01T00:00:00.000Z',
    category: 'home',
    problemTitle: 'Humedad en la pared',
    problemExplanation: 'Se observa una mancha de humedad localizada en la pared.',
    confidence: 'medium',
    steps: [{ order: 1, instruction: 'Ventilá el ambiente diariamente.' }],
    requiredItems: [],
    estimatedTimeMinutes: null,
    difficulty: 'easy',
    warnings: [],
    followUpQuestions: [],
    risk: 'none',
    recommendsProfessional: false,
    imageUri: null,
    userContext: null,
    ...overrides,
  };
}

describe('LocalSolutionSimplificationService', () => {
  const service = new LocalSolutionSimplificationService();

  it('replaces jargon words with simpler synonyms (Spanish)', async () => {
    const result = await service.simplify(
      buildResult({ problemExplanation: 'Se observa una mancha localizada, aproximadamente pequeña.' }),
    );
    expect(result.explanation).toContain('en un solo lugar');
    expect(result.explanation).toContain('más o menos');
    expect(result.explanation).not.toMatch(/\blocalizada\b/i);
  });

  it('replaces jargon words with simpler synonyms (English)', async () => {
    const result = await service.simplify(
      buildResult({
        problemExplanation: 'The stain is localized and approximately small in size.',
        steps: [{ order: 1, instruction: 'Check the appliance immediately.' }],
      }),
    );
    expect(result.explanation.toLowerCase()).toContain('about');
    expect(result.steps[0].toLowerCase()).toContain('right now');
  });

  it('splits a long compound sentence at a coordinating conjunction', async () => {
    const result = await service.simplify(
      buildResult({
        problemExplanation:
          'Ventilá el ambiente todos los días durante quince minutos, y revisá que no haya una fuente de agua cercana.',
      }),
    );
    expect(result.explanation.split(/[.!?]/).filter(Boolean).length).toBeGreaterThan(1);
  });

  it('does not split a short lead-in clause into an awkward fragment', async () => {
    const result = await service.simplify(buildResult({ problemExplanation: 'Sacá el paño, y listo.' }));
    // "Sacá el paño" is shorter than MIN_CLAUSE_LENGTH, so this stays as one sentence.
    expect(result.explanation).toBe('Sacá el paño, y listo.');
  });

  it('preserves the original capitalization style of a replaced word', async () => {
    const result = await service.simplify(
      buildResult({ problemExplanation: 'Aproximadamente diez minutos son suficientes.' }),
    );
    expect(result.explanation.startsWith('Más o menos')).toBe(true);
  });

  it('simplifies every step instruction, not just the explanation', async () => {
    const result = await service.simplify(
      buildResult({
        steps: [
          { order: 1, instruction: 'Verificá el drenaje.' },
          { order: 2, instruction: 'Utilizá un paño seco.' },
        ],
      }),
    );
    expect(result.steps).toHaveLength(2);
    expect(result.steps[0]).toContain('Revisá');
    expect(result.steps[1]).toContain('Usá');
  });
});
