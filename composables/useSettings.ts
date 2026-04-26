import { DEFAULT_SETTINGS, SETTINGS_KEYS, type Settings } from '@/types/settings';

export async function loadSettings(): Promise<Settings> {
  const stored = await browser.storage.sync.get(SETTINGS_KEYS as string[]);
  return { ...DEFAULT_SETTINGS, ...(stored as Partial<Settings>) };
}

export async function saveSettings(settings: Settings): Promise<void> {
  await browser.storage.sync.set(settings);
}

export async function notifyMenusToRebuild(): Promise<void> {
  try {
    await browser.runtime.sendMessage({ action: 'rebuildMenus' });
  } catch {
    // Background may be sleeping or not yet listening; safe to ignore.
  }
}
