import { riskClassifier } from '../../src/safety/riskClassifier';
import { AnalysisResult, RiskLevel } from '../../src/types/analysis';

const RISK_SEVERITY: Record<RiskLevel, number> = { none: 0, low: 1, medium: 2, high: 3 };

function moreSevere(a: RiskLevel, b: RiskLevel): RiskLevel {
  return RISK_SEVERITY[a] >= RISK_SEVERITY[b] ? a : b;
}

type MappedResult = Omit<AnalysisResult, 'id' | 'createdAt' | 'imageUri' | 'userContext'>;

/**
 * The authoritative safety gate, applied after the AI call and before the
 * response ever reaches the client. Never trusts the model's own
 * `safetyLevel` (already mapped into `mapped.risk`) in isolation:
 *
 *   1. Independently re-classifies the model's own problem/explanation/
 *      warning text with the same keyword-based `riskClassifier` the
 *      client uses defensively — a second, independent signal.
 *   2. Takes the MORE severe of the two signals — a model that
 *      under-reports risk never gets to slip through just because the
 *      keyword pass also missed it, and vice versa.
 *   3. When the final risk is "high", replaces the model's own step-by-step
 *      instructions with a single safe, generic step and clears
 *      "materials" — even if the model ignored the system prompt's
 *      instruction to keep steps generic for risky situations, this is
 *      the backend's own enforcement of "never give dangerous
 *      instructions", not a suggestion.
 *
 * `mapped.problemTitle` / `problemExplanation` are left untouched: naming
 * and explaining the problem is safe and useful even at high risk — only
 * actionable instructions are gated.
 */
export function applySafetyPolicy(mapped: MappedResult, locale: 'es' | 'en'): MappedResult {
  const textSignal = riskClassifier.classifyText(
    [mapped.problemTitle, mapped.problemExplanation, ...mapped.warnings].join('. '),
  );
  const finalRisk = moreSevere(mapped.risk, textSignal);

  if (finalRisk === 'high') {
    return {
      ...mapped,
      risk: 'high',
      confidence: 'low',
      recommendsProfessional: true,
      steps: [
        {
          order: 1,
          instruction:
            locale === 'en'
              ? 'This may involve real physical risk. Do not attempt a repair yourself — contact a qualified professional.'
              : 'Esto puede implicar un riesgo físico real. No intentes repararlo vos mismo — contactá a un profesional cualificado.',
        },
      ],
      requiredItems: [],
    };
  }

  if (finalRisk === 'medium') {
    return {
      ...mapped,
      risk: finalRisk,
      recommendsProfessional: true,
    };
  }

  return { ...mapped, risk: finalRisk };
}
