import { LocalSolutionSimplificationService } from './LocalSolutionSimplificationService';
import { SolutionSimplificationService } from './SolutionSimplificationService';

export * from './SolutionSimplificationService';
export { LocalSolutionSimplificationService } from './LocalSolutionSimplificationService';

/** Single place that decides which `SolutionSimplificationService` the app
 * uses — currently always the local, zero-cost rule-based one. See that
 * class's doc comment for what a future AI-backed version would replace. */
export function createSolutionSimplificationService(): SolutionSimplificationService {
  return new LocalSolutionSimplificationService();
}
