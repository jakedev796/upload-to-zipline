import { DEFAULT_SETTINGS, SETTINGS_KEYS, type Settings } from '@/types/settings';
import { detectBrowserLocale, isValidLocale } from '@/composables/useI18n';

export async function loadSettings(): Promise<Settings> {
  const stored = await browser.storage.sync.get(SETTINGS_KEYS as string[]);
  const locale = isValidLocale(stored.locale) ? stored.locale : detectBrowserLocale();
  return { ...DEFAULT_SETTINGS, ...(stored as Partial<Settings>), locale };
}

export async function saveSettings(settings: Settings, saveLocale = false): Promise<void> {
  const payload: Partial<Settings> = { ...settings };
  if (!saveLocale) {
    const stored = await browser.storage.sync.get(['locale']);
    if (!isValidLocale(stored.locale)) {
      delete payload.locale;
    }
  }
  await browser.storage.sync.set(payload);
}
