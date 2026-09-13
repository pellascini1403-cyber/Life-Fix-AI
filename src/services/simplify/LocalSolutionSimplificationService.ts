import { AnalysisResult } from '../../types/analysis';
import { SimplifiedSolution, SolutionSimplificationService } from './SolutionSimplificationService';

/**
 * Rule-based, zero-cost, zero-network "simplifier": word substitution
 * (jargon → plain language) plus splitting long compound sentences at a
 * coordinating conjunction ("y"/"pero"/"o", "and"/"but"/"or"). This is
 * NOT real AI-level rewriting — it won't restructure a sentence it can't
 * safely split, and its dictionary only covers common wording from this
 * app's own solutions. It exists so "Explicámelo más fácil" is a real,
 * working feature today, with the interface already in place for a
 * genuine AI-backed rewrite later (see `SolutionSimplificationService`).
 */
export class LocalSolutionSimplificationService implements SolutionSimplificationService {
  async simplify(result: AnalysisResult): Promise<SimplifiedSolution> {
    const locale = detectLocale(result);
    return {
      explanation: simplifyText(result.problemExplanation, locale),
      steps: result.steps.map((step) => simplifyText(step.instruction, locale)),
    };
  }
}

type Locale = 'es' | 'en';

/** No explicit locale on `AnalysisResult` — inferred from a handful of
 * common Spanish stopwords, since that's this app's default language and
 * the dictionary/splitting rules below are locale-specific. */
function detectLocale(result: AnalysisResult): Locale {
  const sample = `${result.problemExplanation} ${result.steps.map((s) => s.instruction).join(' ')}`;
  return /\b(el|la|los|las|que|con|para|una|un)\b/i.test(sample) ? 'es' : 'en';
}

const DICTIONARY: Record<Locale, Record<string, string>> = {
  es: {
    aproximadamente: 'más o menos',
    diariamente: 'todos los días',
    localizada: 'en un solo lugar',
    concentrada: 'junta en un lugar',
    extendido: 'que se expandió',
    considerable: 'grande',
    adicional: 'extra',
    inmediatamente: 'ahora mismo',
    posteriormente: 'después',
    recomendable: 'lo mejor',
    excesivo: 'demasiado',
    // Common "vos" imperative verb forms this app's own solutions use —
    // deliberately conjugated forms, not infinitives, since infinitives
    // ("verificar") don't match imperative sentences ("Verificá esto").
    verificá: 'revisá',
    inspeccioná: 'revisá',
    utilizá: 'usá',
    generá: 'hacé',
  },
  en: {
    approximately: 'about',
    localized: 'in one spot',
    concentrated: 'gathered in one spot',
    extended: 'that spread',
    considerable: 'large',
    inspect: 'check',
    verify: 'check',
    additional: 'extra',
    generate: 'make',
    utilize: 'use',
    immediately: 'right now',
    subsequently: 'after that',
    recommended: 'best',
    excessive: 'too much',
  },
};

const CONJUNCTION_PATTERN: Record<Locale, RegExp> = {
  es: /,\s+(y|pero|o)\s+/i,
  en: /,\s+(and|but|or)\s+/i,
};

/** Minimum length (characters) the clause before the split must have —
 * avoids splitting short lead-ins like "Sacá el paño, y..." into two
 * fragments that read worse than the original. */
const MIN_CLAUSE_LENGTH = 20;

function simplifyText(text: string, locale: Locale): string {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => splitAtConjunction(sentence, locale))
    .flat()
    .map((sentence) => substituteWords(sentence, locale))
    .join(' ');
}

function splitAtConjunction(sentence: string, locale: Locale): string[] {
  const match = sentence.match(CONJUNCTION_PATTERN[locale]);
  if (!match || match.index === undefined || match.index < MIN_CLAUSE_LENGTH) {
    return [sentence];
  }

  const before = sentence.slice(0, match.index).trim();
  const after = sentence.slice(match.index + match[0].length).trim();
  if (!before || !after) return [sentence];

  const capitalizedAfter = after.charAt(0).toUpperCase() + after.slice(1);
  const beforeWithPeriod = /[.!?]$/.test(before) ? before : `${before}.`;
  return [beforeWithPeriod, capitalizedAfter];
}

/** Matches a run of letters, including accented Spanish vowels and "ñ"/"Ñ"
 * (the Latin-1 Supplement letter range). Deliberately not `\b`-based: JS's
 * `\b` treats accented letters as non-word characters, so `\bverificá\b`
 * silently never matches "Verificá " — this tokenizes on letter runs
 * directly instead, which sidesteps that entirely. */
const WORD_PATTERN = /[A-Za-zÀ-ÖØ-öø-ÿ]+/g;

function substituteWords(sentence: string, locale: Locale): string {
  const dictionary = DICTIONARY[locale];
  return sentence.replace(WORD_PATTERN, (word) => {
    const replacement = dictionary[word.toLowerCase()];
    return replacement ? matchCase(word, replacement) : word;
  });
}

function matchCase(original: string, replacement: string): string {
  if (original[0] === original[0].toUpperCase() && original[0] !== original[0].toLowerCase()) {
    return replacement.charAt(0).toUpperCase() + replacement.slice(1);
  }
  return replacement;
}
