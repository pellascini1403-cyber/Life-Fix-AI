import { ProviderAnalysis } from '../schema';
import {
  mapProviderOutputToAnalysisResult,
  mapSafetyLevelToRisk,
} from '../mapping/mapProviderOutputToAnalysisResult';

function buildProviderAnalysis(overrides: Partial<ProviderAnalysis> = {}): ProviderAnalysis {
  return {
    category: 'clothing',
    problem: 'Oil stain on cotton fabric',
    confidence: 'high',
    explanation: 'Dark-edged stain consistent with oil or grease.',
    steps: [
      { number: 2, title: 'Apply detergent', description: 'Dab liquid detergent on the stain.' },
      { number: 1, title: 'Blot', description: 'Blot the excess with a paper towel.' },
    ],
    materials: ['Liquid detergent'],
    estimatedTimeMinutes: { min: 15, max: 20 },
    difficulty: 'easy',
    warnings: ["Don't use hot water before treating the stain."],
    thingsToAvoid: ['Do not rub the stain in.'],
    followUpQuestions: [],
    safetyLevel: 'safe',
    ...overrides,
  };
}

describe('mapSafetyLevelToRisk', () => {
  it('maps safe/caution/professional onto none/medium/high', () => {
    expect(mapSafetyLevelToRisk('safe')).toBe('none');
    expect(mapSafetyLevelToRisk('caution')).toBe('medium');
    expect(mapSafetyLevelToRisk('professional')).toBe('high');
  });
});

describe('mapProviderOutputToAnalysisResult', () => {
  it('maps problem/explanation/category/confidence/difficulty straight across', () => {
    const mapped = mapProviderOutputToAnalysisResult(buildProviderAnalysis());
    expect(mapped.problemTitle).toBe('Oil stain on cotton fabric');
    expect(mapped.problemExplanation).toBe('Dark-edged stain consistent with oil or grease.');
    expect(mapped.category).toBe('clothing');
    expect(mapped.confidence).toBe('high');
    expect(mapped.difficulty).toBe('easy');
  });

  it('sorts steps by number and combines title + description into one instruction', () => {
    const mapped = mapProviderOutputToAnalysisResult(buildProviderAnalysis());
    expect(mapped.steps).toEqual([
      { order: 1, instruction: 'Blot. Blot the excess with a paper towel.' },
      { order: 2, instruction: 'Apply detergent. Dab liquid detergent on the stain.' },
    ]);
  });

  it('merges warnings and thingsToAvoid into the single warnings list', () => {
    const mapped = mapProviderOutputToAnalysisResult(buildProviderAnalysis());
    expect(mapped.warnings).toEqual([
      "Don't use hot water before treating the stain.",
      'Do not rub the stain in.',
    ]);
  });

  it('maps materials to requiredItems and passes followUpQuestions through', () => {
    const mapped = mapProviderOutputToAnalysisResult(
      buildProviderAnalysis({ followUpQuestions: ['What material is the item made of?'] }),
    );
    expect(mapped.requiredItems).toEqual(['Liquid detergent']);
    expect(mapped.followUpQuestions).toEqual(['What material is the item made of?']);
  });

  it('recommends a professional for both "caution" and "professional" safety levels', () => {
    const caution = mapProviderOutputToAnalysisResult(buildProviderAnalysis({ safetyLevel: 'caution' }));
    const professional = mapProviderOutputToAnalysisResult(
      buildProviderAnalysis({ safetyLevel: 'professional' }),
    );
    expect(caution.recommendsProfessional).toBe(true);
    expect(professional.recommendsProfessional).toBe(true);
  });

  it('does not recommend a professional when safe', () => {
    const mapped = mapProviderOutputToAnalysisResult(buildProviderAnalysis({ safetyLevel: 'safe' }));
    expect(mapped.recommendsProfessional).toBe(false);
  });
});
