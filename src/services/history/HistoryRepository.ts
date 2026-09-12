import AsyncStorage from '@react-native-async-storage/async-storage';

import { HistoryEntry } from '../../types/analysis';

const STORAGE_KEY = '@lifefix/history';

/**
 * Local persistence for saved analyses. Privacy-by-design constraints:
 *  - Nothing is saved automatically; an entry only exists here after the
 *    user explicitly taps "save to history" on a result.
 *  - The image URI kept is the on-device capture/picker URI, not a
 *    server-hosted copy — there is no image upload/storage step yet, and
 *    when one exists it must respect `historyRetentionDays` from
 *    `EntitlementsService` and support hard deletion.
 *  - `clear()` / `remove()` must be real, immediate deletes, never a soft
 *    "archived" flag.
 */
export interface HistoryRepository {
  list(): Promise<HistoryEntry[]>;
  add(entry: HistoryEntry): Promise<void>;
  remove(analysisId: string): Promise<void>;
  clear(): Promise<void>;
}

export class AsyncStorageHistoryRepository implements HistoryRepository {
  async list(): Promise<HistoryEntry[]> {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw) as HistoryEntry[];
      return parsed.sort((a, b) => b.result.createdAt.localeCompare(a.result.createdAt));
    } catch {
      return [];
    }
  }

  async add(entry: HistoryEntry): Promise<void> {
    const current = await this.list();
    const next = [entry, ...current.filter((e) => e.result.id !== entry.result.id)];
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  async remove(analysisId: string): Promise<void> {
    const current = await this.list();
    const next = current.filter((e) => e.result.id !== analysisId);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  async clear(): Promise<void> {
    await AsyncStorage.removeItem(STORAGE_KEY);
  }
}

export const historyRepository: HistoryRepository = new AsyncStorageHistoryRepository();
