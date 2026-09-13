import { AnthropicVisionProvider } from './AnthropicVisionProvider';
import { VisionAnalysisProvider } from './VisionAnalysisProvider';

export * from './VisionAnalysisProvider';
export { AnthropicVisionProvider } from './AnthropicVisionProvider';

/**
 * Single place that decides which `VisionAnalysisProvider` the backend
 * uses. Anthropic is the only implementation today; if Resolia ever needs
 * a second provider (fallback, cost routing, A/B test), it plugs in here
 * without `analyzeHandler.ts` changing at all.
 */
export function createVisionAnalysisProvider(): VisionAnalysisProvider {
  return new AnthropicVisionProvider();
}
