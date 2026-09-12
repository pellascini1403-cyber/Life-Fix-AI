import { Entitlements, PlanId, PlanLimits } from '../../types/entitlements';

/** Plan definitions live here, data-driven, so limits can change without
 * touching call sites. Values are placeholders pending product/business
 * decisions — nothing about the shape should need to change to update them. */
export const PLAN_LIMITS: Record<PlanId, PlanLimits> = {
  free: {
    dailyAnalyses: 3,
    historyRetentionDays: 30,
    followUpQuestionsAllowed: false,
    adsEnabled: true,
  },
  pro: {
    dailyAnalyses: null,
    historyRetentionDays: null,
    followUpQuestionsAllowed: true,
    adsEnabled: false,
  },
};

/**
 * Reads/enforces the user's plan and usage. Real purchases (StoreKit / Play
 * Billing via RevenueCat, or similar) are not implemented yet — this is the
 * seam a future `RevenueCatEntitlementsService` plugs into. Callers should
 * only ever depend on this interface, never on a specific IAP SDK.
 */
export interface EntitlementsService {
  getEntitlements(): Promise<Entitlements>;
  canRunAnalysis(): Promise<boolean>;
  recordAnalysisUsed(): Promise<void>;
  isPro(): Promise<boolean>;
}

/**
 * In-memory, device-local implementation for Phase 1: everyone starts on
 * `free` with a usage counter that resets only per app session. No purchase
 * flow, no server sync yet — see interface doc for what's still missing.
 */
export class LocalEntitlementsService implements EntitlementsService {
  private plan: PlanId = 'free';
  private analysesUsedToday = 0;

  async getEntitlements(): Promise<Entitlements> {
    return {
      plan: this.plan,
      limits: PLAN_LIMITS[this.plan],
      analysesUsedToday: this.analysesUsedToday,
    };
  }

  async canRunAnalysis(): Promise<boolean> {
    const { limits, analysesUsedToday } = await this.getEntitlements();
    if (limits.dailyAnalyses === null) return true;
    return analysesUsedToday < limits.dailyAnalyses;
  }

  async recordAnalysisUsed(): Promise<void> {
    this.analysesUsedToday += 1;
  }

  async isPro(): Promise<boolean> {
    return this.plan === 'pro';
  }
}

export const entitlementsService: EntitlementsService = new LocalEntitlementsService();
