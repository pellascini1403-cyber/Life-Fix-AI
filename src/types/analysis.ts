/** Domain types shared by the analysis flow, history, and result UI. */

export type ConfidenceLevel = 'high' | 'medium' | 'low';

export type DifficultyLevel = 'easy' | 'medium' | 'hard';

export type RiskLevel = 'none' | 'low' | 'medium' | 'high';

export type ProblemCategory =
  | 'home'
  | 'repairs'
  | 'cleaning'
  | 'clothing'
  | 'garden'
  | 'objects'
  | 'other';

/** A single actionable step in a solution's instructions. */
export interface SolutionStep {
  order: number;
  instruction: string;
}

/** The structured result the AI/backend returns for one analysis. */
export interface AnalysisResult {
  id: string;
  createdAt: string;
  category: ProblemCategory;

  problemTitle: string;
  problemExplanation: string;
  confidence: ConfidenceLevel;

  steps: SolutionStep[];
  requiredItems: string[];
  estimatedTimeMinutes: { min: number; max: number } | null;
  difficulty: DifficultyLevel;
  warnings: string[];

  risk: RiskLevel;
  recommendsProfessional: boolean;

  /** Local URI of the photo used, kept only as long as privacy rules allow. */
  imageUri: string | null;
  userContext: string | null;
}

/** User feedback captured after showing a result. */
export type SolutionFeedback = 'helpful' | 'not_helpful';

/** Persisted history entry — a saved AnalysisResult plus feedback state. */
export interface HistoryEntry {
  result: AnalysisResult;
  feedback: SolutionFeedback | null;
}

/** Input to request an analysis. Image data never leaves this shape's owner
 * (the service implementation) without going through our own backend. */
export interface AnalysisRequest {
  imageUri: string;
  userContext?: string;
  category?: ProblemCategory;
}
