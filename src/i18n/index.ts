import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';
import es from './locales/es.json';

export const resources = {
  en: { translation: en },
  es: { translation: es },
} as const;

export const supportedLanguages = ['es', 'en'] as const;
export type SupportedLanguage = (typeof supportedLanguages)[number];

export const LANGUAGE_STORAGE_KEY = 'lifefix.language.v1';

function isSupportedLanguage(value: string | null | undefined): value is SupportedLanguage {
  return (supportedLanguages as readonly string[]).includes(value ?? '');
}

function resolveDeviceLanguage(): SupportedLanguage {
  const deviceLanguage = Localization.getLocales()[0]?.languageCode;
  return isSupportedLanguage(deviceLanguage) ? deviceLanguage : 'es';
}

// eslint-disable-next-line import/no-named-as-default-member -- i18next's default export intentionally also carries `.use`
void i18n.use(initReactI18next).init({
  resources,
  lng: resolveDeviceLanguage(),
  fallbackLng: 'es',
  interpolation: { escapeValue: false },
});

/** Restores a previously-chosen language over the device-locale default.
 * Best-effort: if storage is empty or unreadable, the app just keeps
 * whatever `init()` already resolved above. */
export async function loadPersistedLanguage(): Promise<void> {
  try {
    const stored = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (isSupportedLanguage(stored) && stored !== i18n.language) {
      // eslint-disable-next-line import/no-named-as-default-member -- see note above
      await i18n.changeLanguage(stored);
    }
  } catch {
    // Ignore: the device-locale default from init() above still applies.
  }
}
void loadPersistedLanguage();

/** Changes the active language and persists the choice for next launch.
 * Profile should call this instead of `i18n.changeLanguage` directly. */
export async function changeAndPersistLanguage(language: SupportedLanguage): Promise<void> {
  // eslint-disable-next-line import/no-named-as-default-member -- see note above
  await i18n.changeLanguage(language);
  try {
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch {
    // Best-effort: the language is still applied for this session even if
    // it won't survive an app restart.
  }
}

export default i18n;
