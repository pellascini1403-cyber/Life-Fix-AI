/** Subscription/entitlement domain types. Kept data-driven so limits and
 * plan features can change server-side without an app update. */

export type PlanId = 'free' | 'pro';

export interface PlanLimits {
  dailyAnalyses: number | null; // null = unlimited
  historyRetentionDays: number | null; // null = unlimited
  followUpQuestionsAllowed: boolean;
  adsEnabled: boolean;
}

export interface Entitlements {
  plan: PlanId;
  limits: PlanLimits;
  analysesUsedToday: number;
}
