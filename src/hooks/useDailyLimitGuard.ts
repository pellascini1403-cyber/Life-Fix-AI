import { useCallback } from 'react';
import { Alert } from 'react-native';
import { useTranslation } from 'react-i18next';

import { entitlementsService } from '../services/entitlements/EntitlementsService';

/**
 * Gate for starting a new analysis: resolves `true` when the user is still
 * under their plan's daily limit, `false` (after showing an explanatory
 * alert) when they've hit it. No paywall/purchase flow here — the alert is
 * purely informational until Phase 4 adds one.
 */
export function useDailyLimitGuard() {
  const { t } = useTranslation();

  return useCallback(async (): Promise<boolean> => {
    const canRun = await entitlementsService.canRunAnalysis();
    if (!canRun) {
      Alert.alert(t('entitlements.limitReachedTitle'), t('entitlements.limitReachedBody'));
    }
    return canRun;
  }, [t]);
}
