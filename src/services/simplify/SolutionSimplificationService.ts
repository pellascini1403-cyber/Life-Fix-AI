import { AnalysisResult } from '../../types/analysis';

/** A simplified rewrite of a result's explanation and steps — same
 * content, plainer language and shorter sentences. */
export interface SimplifiedSolution {
  explanation: string;
  steps: string[];
}

/**
 * Powers the "Explicámelo más fácil" feature: takes a full
 * `AnalysisResult` and returns an easier-to-read version of its
 * explanation and steps.
 *
 * This is intentionally its own interface, separate from `AIService` —
 * simplifying existing text and analyzing a new photo are different
 * capabilities, and a future real implementation (an AI call) will likely
 * have a very different cost/latency profile than `AIService.analyze()`.
 * `LocalSolutionSimplificationService` is a rule-based stand-in with zero
 * network cost; swapping in a real AI-backed implementation later is a
 * one-file change behind this same interface.
 */
export interface SolutionSimplificationService {
  simplify(result: AnalysisResult): Promise<SimplifiedSolution>;
}
