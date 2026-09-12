import { ProviderAnalysis } from '../schema';

export interface VisionAnalysisInput {
  imageBase64: string;
  imageMimeType: string;
  userContext?: string;
  category?: string;
  locale: 'es' | 'en';
}

/**
 * The seam between the backend and whichever multimodal AI provider
 * answers "what's in this photo and how do I fix it". Concrete
 * implementations own the actual provider call; everything upstream
 * (`analyzeHandler.ts`) only depends on this interface, so swapping
 * providers later is a one-file change (see README "AI provider").
 */
export interface VisionAnalysisProvider {
  analyze(input: VisionAnalysisInput): Promise<ProviderAnalysis>;
}
