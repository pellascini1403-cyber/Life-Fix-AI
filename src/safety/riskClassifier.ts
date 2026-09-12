import { RiskLevel } from '../types/analysis';

/**
 * Safety is a first-class part of the analysis pipeline, not a post-hoc
 * filter. The real classifier will live in the backend, next to the AI
 * call, so a risky result can never reach the client without already being
 * downgraded/flagged. This local classifier exists so the mobile UI can:
 *   1. Reason about `RiskLevel` consistently (types, banners, copy).
 *   2. Apply a defensive client-side check on free-text user context, in
 *      case a future on-device/offline flow ever bypasses the backend.
 *
 * It must never be the only safety gate for anything shipped to production.
 */

export interface RiskClassifier {
  classifyText(text: string): RiskLevel;
}

const HIGH_RISK_KEYWORDS = [
  // electricity / gas / fire
  'electrocut',
  'cable pelado',
  'exposed wire',
  'cortocircuito',
  'short circuit',
  'olor a gas',
  'gas leak',
  'fuga de gas',
  'incendio',
  'fire',
  'explos',
  // structural / vehicles / weapons / medicine
  'grieta estructural',
  'structural crack',
  'freno',
  'brake',
  'arma',
  'weapon',
  'sobredosis',
  'overdose',
  'síntoma',
  'symptom',
  'dolor de pecho',
  'chest pain',
  'sangrado',
  'bleeding',
];

const MEDIUM_RISK_KEYWORDS = [
  'electric',
  'eléctric',
  'gas',
  'químico',
  'chemical',
  'lejía',
  'bleach',
  'ácido',
  'acid',
  'techo',
  'roof',
  'altura',
  'ladder',
  'escalera',
];

function containsAny(haystack: string, needles: string[]): boolean {
  return needles.some((needle) => haystack.includes(needle));
}

export class KeywordRiskClassifier implements RiskClassifier {
  classifyText(text: string): RiskLevel {
    const normalized = text.trim().toLowerCase();
    if (!normalized) return 'none';
    if (containsAny(normalized, HIGH_RISK_KEYWORDS)) return 'high';
    if (containsAny(normalized, MEDIUM_RISK_KEYWORDS)) return 'medium';
    return 'none';
  }
}

export const riskClassifier: RiskClassifier = new KeywordRiskClassifier();

export function shouldRecommendProfessional(risk: RiskLevel): boolean {
  return risk === 'high' || risk === 'medium';
}
