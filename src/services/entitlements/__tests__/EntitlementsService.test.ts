import AsyncStorage from '@react-native-async-storage/async-storage';

import { ENTITLEMENTS_STORAGE_KEY, LocalEntitlementsService, PLAN_LIMITS } from '../EntitlementsService';

describe('LocalEntitlementsService', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

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

  it('persists today\'s usage across instances, simulating an app restart', async () => {
    const first = new LocalEntitlementsService();
    await first.recordAnalysisUsed();
    await first.recordAnalysisUsed();

    const second = new LocalEntitlementsService();
    const entitlements = await second.getEntitlements();

    expect(entitlements.analysesUsedToday).toBe(2);
  });

  it('resets the daily counter automatically once the stored date is no longer today', async () => {
    await AsyncStorage.setItem(
      ENTITLEMENTS_STORAGE_KEY,
      JSON.stringify({ date: '2000-01-01', analysesUsedToday: PLAN_LIMITS.free.dailyAnalyses }),
    );

    const service = new LocalEntitlementsService();
    const entitlements = await service.getEntitlements();

    expect(entitlements.analysesUsedToday).toBe(0);
    expect(await service.canRunAnalysis()).toBe(true);
  });

  it('writes the reset back to storage so later reads on the new day also see zero', async () => {
    await AsyncStorage.setItem(
      ENTITLEMENTS_STORAGE_KEY,
      JSON.stringify({ date: '2000-01-01', analysesUsedToday: 3 }),
    );

    const first = new LocalEntitlementsService();
    await first.getEntitlements();

    const second = new LocalEntitlementsService();
    const entitlements = await second.getEntitlements();

    expect(entitlements.analysesUsedToday).toBe(0);
  });

  it('falls back to a fresh free-plan state when stored usage data is corrupt', async () => {
    await AsyncStorage.setItem(ENTITLEMENTS_STORAGE_KEY, 'not valid json');

    const service = new LocalEntitlementsService();
    const entitlements = await service.getEntitlements();

    expect(entitlements.analysesUsedToday).toBe(0);
    expect(await service.canRunAnalysis()).toBe(true);
  });
});
