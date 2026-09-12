export type AnalyticsEvent =
  | { name: 'analysis_started'; category?: string }
  | { name: 'analysis_completed'; category: string; confidence: string }
  | { name: 'analysis_failed'; reason: string }
  | { name: 'solution_feedback'; feedback: 'helpful' | 'not_helpful' }
  | { name: 'history_entry_deleted' }
  | { name: 'paywall_viewed' };

/**
 * No analytics provider is wired up yet (Amplitude / PostHog / Firebase —
 * to be decided). Call sites should depend only on this interface so that
 * choice is a one-file change later.
 */
export interface AnalyticsService {
  track(event: AnalyticsEvent): void;
}

/** Default no-op implementation: safe to call from anywhere, does nothing. */
export class NoopAnalyticsService implements AnalyticsService {
  track(): void {
    // Intentionally empty until a provider is chosen.
  }
}
