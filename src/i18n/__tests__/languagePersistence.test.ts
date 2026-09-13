import AsyncStorage from '@react-native-async-storage/async-storage';

import i18nInstance, { changeAndPersistLanguage, LANGUAGE_STORAGE_KEY, loadPersistedLanguage } from '../index';

describe('language persistence', () => {
  afterEach(async () => {
    // Leave the shared i18n instance back on the default language for other tests.
    await changeAndPersistLanguage('es');
  });

  it('persists the chosen language to storage and applies it immediately', async () => {
    await changeAndPersistLanguage('en');

    expect(await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('en');
    expect(i18nInstance.language).toBe('en');
  });

  it('restores a previously persisted language on the next load', async () => {
    await changeAndPersistLanguage('es'); // simulate the running app currently being on a different language
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, 'en'); // a choice persisted in an earlier session

    await loadPersistedLanguage();

    expect(i18nInstance.language).toBe('en');
  });

  it('leaves the current language untouched when nothing was persisted', async () => {
    await AsyncStorage.clear();
    await changeAndPersistLanguage('es');

    await loadPersistedLanguage();

    expect(i18nInstance.language).toBe('es');
  });

  it('ignores an unsupported stored value', async () => {
    await changeAndPersistLanguage('es');
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, 'fr');

    await loadPersistedLanguage();

    expect(i18nInstance.language).toBe('es');
  });
});
