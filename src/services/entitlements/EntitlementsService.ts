import AsyncStorage from '@react-native-async-storage/async-storage';

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

export const ENTITLEMENTS_STORAGE_KEY = 'lifefix.entitlements.usage.v1';
const STORAGE_KEY = ENTITLEMENTS_STORAGE_KEY;

interface PersistedUsage {
  date: string;
  analysesUsedToday: number;
}

function todayKey(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, '0');
  const day = `${now.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Device-local implementation, persisted to AsyncStorage: everyone is on
 * `free` (no purchase flow exists yet — see interface doc), with a daily
 * analysis counter that survives app restarts and resets automatically the
 * first time it's read on a new local calendar day.
 */
export class LocalEntitlementsService implements EntitlementsService {
  private plan: PlanId = 'free';
  private analysesUsedToday = 0;
  private lastResetDate: string | null = null;
  private loaded = false;
  private loadPromise: Promise<void> | null = null;

  private async ensureLoaded(): Promise<void> {
    if (!this.loaded) {
      if (!this.loadPromise) {
        this.loadPromise = this.loadFromStorage();
      }
      await this.loadPromise;
    }
    this.applyDailyResetIfNeeded();
  }

  private async loadFromStorage(): Promise<void> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const parsed = raw ? (JSON.parse(raw) as PersistedUsage) : null;
      this.lastResetDate = parsed?.date ?? todayKey();
      this.analysesUsedToday = parsed?.analysesUsedToday ?? 0;
    } catch {
      this.lastResetDate = todayKey();
      this.analysesUsedToday = 0;
    } finally {
      this.loaded = true;
    }
  }

  private applyDailyResetIfNeeded(): void {
    const today = todayKey();
    if (this.lastResetDate !== today) {
      this.lastResetDate = today;
      this.analysesUsedToday = 0;
      void this.persist();
    }
  }

  private async persist(): Promise<void> {
    try {
      const payload: PersistedUsage = {
        date: this.lastResetDate ?? todayKey(),
        analysesUsedToday: this.analysesUsedToday,
      };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Best-effort persistence: the in-memory counter still stays correct
      // for the rest of this session even if the write failed.
    }
  }

  async getEntitlements(): Promise<Entitlements> {
    await this.ensureLoaded();
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
    await this.ensureLoaded();
    this.analysesUsedToday += 1;
    await this.persist();
  }

  async isPro(): Promise<boolean> {
    await this.ensureLoaded();
    return this.plan === 'pro';
  }
}

export const entitlementsService: EntitlementsService = new LocalEntitlementsService();
