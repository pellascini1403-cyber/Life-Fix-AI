import { ProviderAnalysis } from '../schema';
import { AnalysisResult, RiskLevel } from '../../src/types/analysis';

/** Maps the AI provider's own `safetyLevel` vocabulary onto the app's
 * existing `RiskLevel` type, used everywhere else in the app (badges,
 * `SafetyBanner`, history). See `backend/safety/applySafetyPolicy.ts` for
 * why this is only ONE of two signals that decide the final risk. */
export function mapSafetyLevelToRisk(safetyLevel: ProviderAnalysis['safetyLevel']): RiskLevel {
  switch (safetyLevel) {
    case 'safe':
      return 'none';
    case 'caution':
      return 'medium';
    case 'professional':
      return 'high';
  }
}

/**
 * Converts the AI provider's structured output into the shape the mobile
 * app already renders everywhere (`AnalysisResult`). This is the only
 * place that translates between the two vocabularies, so the rest of the
 * app — screens, components, MockAIService, tests — never needs to know
 * the provider's schema exists.
 *
 * Returns everything except the fields the caller (the request handler)
 * owns: `id`, `createdAt`, `imageUri`, `userContext`.
 */
export function mapProviderOutputToAnalysisResult(
  provider: ProviderAnalysis,
): Omit<AnalysisResult, 'id' | 'createdAt' | 'imageUri' | 'userContext'> {
  return {
    category: provider.category,
    problemTitle: provider.problem,
    problemExplanation: provider.explanation,
    confidence: provider.confidence,
    steps: provider.steps
      .slice()
      .sort((a, b) => a.number - b.number)
      .map((step) => ({
        order: step.number,
        instruction: step.title ? `${step.title}. ${step.description}` : step.description,
      })),
    requiredItems: provider.materials,
    estimatedTimeMinutes: provider.estimatedTimeMinutes,
    difficulty: provider.difficulty,
    // The app's single `warnings` field renders under a "what NOT to do"
    // heading (see app/result.tsx) — the provider's `warnings` and
    // `thingsToAvoid` are both "don't do X" content from the user's point
    // of view, so they combine into that one list rather than needing a
    // second UI section.
    warnings: [...provider.warnings, ...provider.thingsToAvoid],
    followUpQuestions: provider.followUpQuestions,
    risk: mapSafetyLevelToRisk(provider.safetyLevel),
    recommendsProfessional: provider.safetyLevel === 'professional' || provider.safetyLevel === 'caution',
  };
}
