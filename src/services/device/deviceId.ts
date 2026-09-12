import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@lifefix/device-id';

/**
 * A random, locally-generated id persisted on-device — not a security
 * credential, just a correlation key the backend uses for its rate
 * limiter (see backend/rateLimit). Regenerated if storage is cleared,
 * which just resets that device's rate-limit window.
 */
export async function getOrCreateDeviceId(): Promise<string> {
  const existing = await AsyncStorage.getItem(STORAGE_KEY);
  if (existing) return existing;

  const id = generateId();
  await AsyncStorage.setItem(STORAGE_KEY, id);
  return id;
}

function generateId(): string {
  const random = () => Math.random().toString(36).slice(2);
  return `${Date.now().toString(36)}-${random()}-${random()}`;
}
