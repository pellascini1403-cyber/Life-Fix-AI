import { AnalysisRequest, AnalysisResult } from '../../types/analysis';

/**
 * Single entry point the app uses to turn a photo + optional context into a
 * full `AnalysisResult`. Implementations own the split between an image
 * analysis step and a solution-generation step (see `ImageAnalysisService`
 * and `SolutionService` below) — the app never talks to those directly.
 *
 * Production implementations MUST call our own backend, never an AI
 * provider SDK directly: the mobile app must never hold AI provider keys.
 */
export interface AIService {
  analyze(request: AnalysisRequest): Promise<AnalysisResult>;
}

/** Raw problem detection from an image, before solution steps are attached. */
export interface DetectedProblem {
  category: AnalysisResult['category'];
  title: string;
  explanation: string;
  confidence: AnalysisResult['confidence'];
  riskHint: AnalysisResult['risk'];
}

/** Vision step: image (+ context) -> detected problem. Backend-only in
 * production — this is the seam where the AI provider call happens. */
export interface ImageAnalysisService {
  detectProblem(request: AnalysisRequest): Promise<DetectedProblem>;
}

/** Reasoning step: detected problem -> actionable solution. Backend-only in
 * production, and where risk-based downgrading of instructions happens. */
export interface SolutionService {
  buildSolution(
    problem: DetectedProblem,
    request: AnalysisRequest,
  ): Promise<Omit<AnalysisResult, 'id' | 'createdAt' | 'imageUri' | 'userContext'>>;
}
