import { LocalEntitlementsService, PLAN_LIMITS } from '../EntitlementsService';

describe('LocalEntitlementsService', () => {
  it('starts new users on the free plan with its configured daily limit', async () => {
    const service = new LocalEntitlementsService();
    const entitlements = await service.getEntitlements();

    expect(entitlements.plan).toBe('free');
    expect(entitlements.limits).toEqual(PLAN_LIMITS.free);
    expect(entitlements.analysesUsedToday).toBe(0);
  });

  it('allows analyses until the free daily limit is reached', async () => {
    const service = new LocalEntitlementsService();
    const limit = PLAN_LIMITS.free.dailyAnalyses!;

    for (let i = 0; i < limit; i += 1) {
      expect(await service.canRunAnalysis()).toBe(true);
      await service.recordAnalysisUsed();
    }

    expect(await service.canRunAnalysis()).toBe(false);
  });

  it('defines the pro plan as unlimited, ad-free, and with follow-ups allowed', () => {
    expect(PLAN_LIMITS.pro).toEqual({
      dailyAnalyses: null,
      historyRetentionDays: null,
      followUpQuestionsAllowed: true,
      adsEnabled: false,
    });
  });
});
