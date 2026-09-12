import { z } from 'zod/v4';

/** Mirrors `ProblemCategory` in `src/types/analysis.ts`. Kept as a separate
 * literal here (not imported) because this file must stay independent of
 * anything that could pull client code into the server bundle; the values
 * are duplicated intentionally and covered by a test asserting they match. */
export const PROBLEM_CATEGORIES = [
  'home',
  'repairs',
  'cleaning',
  'clothing',
  'garden',
  'objects',
  'other',
] as const;

export const ProblemCategorySchema = z.enum(PROBLEM_CATEGORIES);
export const ConfidenceSchema = z.enum(['high', 'medium', 'low']);
export const DifficultySchema = z.enum(['easy', 'medium', 'hard']);

/** The AI provider's own safety classification. Distinct from (but mapped
 * to) the app's `RiskLevel` — see `mapping/mapProviderOutputToAnalysisResult.ts`. */
export const SafetyLevelSchema = z.enum(['safe', 'caution', 'professional']);

export const ProviderStepSchema = z.object({
  number: z.number().int().positive(),
  title: z.string().min(1).max(120),
  description: z.string().min(1).max(600),
});

/**
 * Strict schema for the AI provider's structured output. Passed to
 * `zodOutputFormat()` so the SDK validates the model's JSON before we ever
 * touch it — see `aiProvider/AnthropicVisionProvider.ts`. Time is a
 * structured minute range rather than a free string ("estimatedTime") so
 * the app never has to parse free text.
 */
export const ProviderAnalysisSchema = z.object({
  category: ProblemCategorySchema,
  problem: z.string().min(1).max(150),
  confidence: ConfidenceSchema,
  explanation: z.string().min(1).max(800),
  steps: z.array(ProviderStepSchema).max(12),
  materials: z.array(z.string().min(1).max(80)).max(20),
  estimatedTimeMinutes: z
    .object({ min: z.number().int().nonnegative().max(1440), max: z.number().int().nonnegative().max(1440) })
    .nullable(),
  difficulty: DifficultySchema,
  warnings: z.array(z.string().min(1).max(300)).max(10),
  thingsToAvoid: z.array(z.string().min(1).max(300)).max(10),
  followUpQuestions: z.array(z.string().min(1).max(200)).max(5),
  safetyLevel: SafetyLevelSchema,
});

export type ProviderAnalysis = z.infer<typeof ProviderAnalysisSchema>;

export const SupportedLocaleSchema = z.enum(['es', 'en']);

/** Validated shape of the `/analyze` request's non-file fields, extracted
 * from the multipart form. The image itself is validated separately in
 * `analyzeHandler.ts` (size/type checks happen before we touch its bytes). */
export const AnalyzeRequestFieldsSchema = z.object({
  userContext: z.string().max(500).optional(),
  category: ProblemCategorySchema.optional(),
  locale: SupportedLocaleSchema.default('es'),
});

export type AnalyzeRequestFields = z.infer<typeof AnalyzeRequestFieldsSchema>;
