import { type UploadHistoryItem, MAX_HISTORY_ITEMS } from '@/types/settings';

export async function getUploadHistory(): Promise<UploadHistoryItem[]> {
  try {
    const result = await browser.storage.local.get(['uploadHistory']);
    return (result.uploadHistory as UploadHistoryItem[]) || [];
  } catch (err) {
    console.error('Failed to get upload history:', err);
    return [];
  }
}

export async function addUploadHistory(
  item: Omit<UploadHistoryItem, 'id'>
): Promise<UploadHistoryItem[]> {
  try {
    const history = await getUploadHistory();
    const newItem: UploadHistoryItem = {
      ...item,
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    };
    const updated = [newItem, ...history.filter((h) => h.url !== item.url)].slice(
      0,
      MAX_HISTORY_ITEMS
    );
    await browser.storage.local.set({ uploadHistory: updated });
    return updated;
  } catch (err) {
    console.error('Failed to add upload history:', err);
    return [];
  }
}

export async function clearUploadHistory(): Promise<void> {
  try {
    await browser.storage.local.remove(['uploadHistory']);
  } catch (err) {
    console.error('Failed to clear upload history:', err);
  }
}

