import { renderHook, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';

import '../../i18n';
import { entitlementsService } from '../../services/entitlements/EntitlementsService';
import { useDailyLimitGuard } from '../useDailyLimitGuard';

jest.mock('../../services/entitlements/EntitlementsService', () => ({
  entitlementsService: { canRunAnalysis: jest.fn() },
}));

describe('useDailyLimitGuard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('resolves true and shows no alert when still under the daily limit', async () => {
    (entitlementsService.canRunAnalysis as jest.Mock).mockResolvedValue(true);
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const { result } = renderHook(() => useDailyLimitGuard());

    const canRun = await result.current();

    expect(canRun).toBe(true);
    expect(alertSpy).not.toHaveBeenCalled();
  });

  it('resolves false and shows the limit-reached alert once the daily limit is hit', async () => {
    (entitlementsService.canRunAnalysis as jest.Mock).mockResolvedValue(false);
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const { result } = renderHook(() => useDailyLimitGuard());

    const canRun = await result.current();

    expect(canRun).toBe(false);
    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        "You've reached today's free limit",
        "You've used your 3 free analyses for today. You can analyze again tomorrow.",
      );
    });
  });
});
