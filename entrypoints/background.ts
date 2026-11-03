import { getCurrentLocale, translate } from '@/composables/useI18n';
import { isProtectedPageError, isProtectedUrl } from '@/utils/url';
import {
  generateTimestampFilename,
  MissingConfigError,
  uploadToZipline,
} from '@/utils/upload';

const memorySnipTabs = new Set<number>();

/** Error that has already been surfaced to the user via a notification. */
class NotifiedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotifiedError';
  }
}

async function addActiveSnipTab(tabId: number): Promise<void> {
  try {
    if (browser.storage?.session) {
      const data = await browser.storage.session.get('snipTabs');
      const tabs = new Set<number>((data.snipTabs as number[]) || []);
      tabs.add(tabId);
      await browser.storage.session.set({ snipTabs: Array.from(tabs) });
      return;
    }
  } catch {
    // fallback to memory
  }
  memorySnipTabs.add(tabId);
}

async function removeActiveSnipTab(tabId: number): Promise<void> {
  try {
    if (browser.storage?.session) {
      const data = await browser.storage.session.get('snipTabs');
      const tabs = new Set<number>((data.snipTabs as number[]) || []);
      tabs.delete(tabId);
      await browser.storage.session.set({ snipTabs: Array.from(tabs) });
      return;
    }
  } catch {
    // fallback to memory
  }
  memorySnipTabs.delete(tabId);
}

async function hasActiveSnipTab(tabId: number): Promise<boolean> {
  try {
    if (browser.storage?.session) {
      const data = await browser.storage.session.get('snipTabs');
      const tabs = new Set<number>((data.snipTabs as number[]) || []);
      return tabs.has(tabId);
    }
  } catch {
    // fallback to memory
  }
  return memorySnipTabs.has(tabId);
}

export default defineBackground(() => {
  browser.runtime.onInstalled.addListener(createContextMenu);
  browser.runtime.onStartup.addListener(createContextMenu);

  browser.tabs.onRemoved.addListener((tabId) => {
    void removeActiveSnipTab(tabId);
  });

  // Rebuild menus automatically when settings or locale change
  browser.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync') {
      if (changes.shortenEnabled || changes.screenshotContextMenuEnabled || changes.locale) {
        void createContextMenu();
      }
    }
  });

  browser.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    const message = msg as {
      action?: string;
      rect?: {
        x: number;
        y: number;
        width: number;
        height: number;
        windowWidth?: number;
        windowHeight?: number;
      };
    };

    if (!message || !message.action) return;

    // 1. Content script snip callbacks (must come from a tracked tab and top-level frame)
    if (message.action === 'areaSnipCompleted' && message.rect) {
      const tabId = sender.tab?.id;
      if (typeof tabId !== 'number' || sender.frameId !== 0) {
        return;
      }
      void (async () => {
        try {
          const isValid = await hasActiveSnipTab(tabId);
          if (!isValid) return;
          await removeActiveSnipTab(tabId);
          await handleAreaSnipCompleted(message, sender.tab);
        } catch (err) {
          if (err instanceof NotifiedError) return;
          console.error('Area snip failed:', err);
          const loc = await getCurrentLocale();
          showNotification(
            translate(loc, 'notifyScreenshotErrorTitle'),
            translate(loc, 'notifyActionFailedMsg')
          );
        }
      })();
      return;
    }

    if (message.action === 'areaSnipCancelled') {
      if (typeof sender.tab?.id === 'number') {
        void removeActiveSnipTab(sender.tab.id);
      }
      return;
    }

    // 2. Extension page actions (must originate from the extension itself, e.g. popup)
    const isExtensionPage =
      !sender.tab &&
      sender.id === browser.runtime.id &&
      Boolean(sender.url?.startsWith(browser.runtime.getURL('/')));

    if (!isExtensionPage) return;

    if (message.action === 'captureVisible') {
      void (async () => {
        try {
          const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
          const url = await captureVisible(tab);
          if (!url) {
            const loc = await getCurrentLocale();
            sendResponse({ success: false, error: translate(loc, 'missingConfig') });
            return;
          }
          sendResponse({ success: true, url });
        } catch (err: unknown) {
          const errorMsg = err instanceof Error ? err.message : String(err);
          sendResponse({ success: false, error: errorMsg });
        }
      })();
      return true;
    }

    if (message.action === 'startAreaSnip') {
      void (async () => {
        const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
        if (tab?.id) {
          await startAreaSnip(tab);
          sendResponse({ success: true });
        } else {
          sendResponse({ success: false, error: 'No active tab' });
        }
      })();
      return true;
    }
  });

  browser.contextMenus.onClicked.addListener(async (info, tab) => {
    try {
      if (info.menuItemId === 'uploadToZipline' && info.srcUrl) {
        await uploadMedia(info.srcUrl, tab);
      } else if (info.menuItemId === 'shortenURL' && info.linkUrl) {
        await shortenURL(info.linkUrl, tab);
      } else if (info.menuItemId === 'snipArea') {
        await startAreaSnip(tab);
      } else if (info.menuItemId === 'captureVisible') {
        await captureVisible(tab);
      } else if (info.menuItemId === 'uploadClipboard') {
        await uploadClipboardFromTab(tab);
      }
    } catch (err) {
      if (err instanceof NotifiedError) return; // user was already notified
      console.error('Context menu action failed:', err);
      const loc = await getCurrentLocale();
      showNotification(
        translate(loc, 'notifyActionFailedTitle'),
        translate(loc, 'notifyActionFailedMsg')
      );
    }
  });

  browser.commands.onCommand.addListener(async (command, tab) => {
    try {
      if (command === 'upload-clipboard') {
        await uploadClipboardFromTab(tab);
        return;
      }
      const activeTab =
        tab ?? (await browser.tabs.query({ active: true, currentWindow: true }))[0];
      if (command === 'capture-area') {
        await startAreaSnip(activeTab);
      } else if (command === 'capture-visible') {
        await captureVisible(activeTab);
      }
    } catch (err) {
      if (err instanceof NotifiedError) return;
      console.error(`Command ${command} failed:`, err);
      const loc = await getCurrentLocale();
      showNotification(
        translate(loc, 'notifyActionFailedTitle'),
        translate(loc, 'notifyActionFailedMsg')
      );
    }
  });
});

function showNotification(title: string, message: string): void {
  browser.notifications.create({
    type: 'basic',
    iconUrl: browser.runtime.getURL('/icon/48.png'),
    title,
    message,
  });
}

async function copyToClipboard(text: string, tabId?: number): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fallback to content script injection below
    }
  }

  if (tabId) {
    try {
      const results = await browser.scripting.executeScript({
        target: { tabId },
        func: async (textToCopy: string) => {
          try {
            await navigator.clipboard.writeText(textToCopy);
            return true;
          } catch {
            return false;
          }
        },
        args: [text],
      });
      if (results?.[0]?.result === true) {
        return true;
      }
    } catch {
      // Silent ignore
    }
  }

  return false;
}

export async function uploadBlob(
  blob: Blob,
  preferredFilename?: string,
  tab?: { id?: number }
): Promise<string | null> {
  const loc = await getCurrentLocale();

  let finalURL: string;
  try {
    finalURL = await uploadToZipline(blob, preferredFilename);
  } catch (err) {
    if (err instanceof MissingConfigError) {
      showNotification(
        translate(loc, 'notifyConfigRequiredTitle'),
        translate(loc, 'notifyConfigRequiredMsg')
      );
      void browser.runtime.openOptionsPage();
      return null;
    }
    throw err;
  }

  const clipboardSuccess = await copyToClipboard(finalURL, tab?.id);
  if (clipboardSuccess) {
    showNotification(
      translate(loc, 'notifyUploadSuccessTitle'),
      translate(loc, 'notifyUploadSuccessMsg')
    );
  } else {
    showNotification(
      translate(loc, 'notifyUploadSuccessTitle'),
      translate(loc, 'notifyUploadSuccessFallbackMsg', { url: finalURL })
    );
  }

  return finalURL;
}

async function uploadMedia(mediaURL: string, tab: { id?: number } | undefined): Promise<void> {
  const blob = await fetch(mediaURL).then((r) => r.blob());
  let filename = (mediaURL.split('/').pop() ?? '').split('?')[0];
  filename = filename.replace(/[\u200B-\u200D\uFEFF]/g, '') || 'upload';

  await uploadBlob(blob, filename, tab);
}

async function captureVisibleDataUrl(windowId?: number): Promise<string> {
  if (typeof windowId === 'number') {
    return await (browser.tabs.captureVisibleTab as (winId: number, opts: unknown) => Promise<string>)(
      windowId,
      { format: 'png' }
    );
  }
  return await (browser.tabs.captureVisibleTab as (opts: unknown) => Promise<string>)({
    format: 'png',
  });
}

async function captureVisible(
  tab?: { id?: number; windowId?: number; url?: string }
): Promise<string | null> {
  const loc = await getCurrentLocale();
  const notifyProtected = (): never => {
    showNotification(
      translate(loc, 'notifyProtectedPageNoticeTitle'),
      translate(loc, 'notifyProtectedPageNoticeMsg')
    );
    throw new NotifiedError(translate(loc, 'notifyProtectedPageNoticeMsg'));
  };
  if (isProtectedUrl(tab?.url)) {
    notifyProtected();
  }
  let dataUrl: string;
  try {
    dataUrl = await captureVisibleDataUrl(tab?.windowId);
  } catch (err) {
    if (isProtectedPageError(err)) notifyProtected();
    throw err;
  }
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  const filename = generateTimestampFilename('screenshot-visible', 'png');
  return await uploadBlob(blob, filename, tab);
}

async function startAreaSnip(tab?: { id?: number; url?: string; pendingUrl?: string }): Promise<void> {
  const loc = await getCurrentLocale();

  if (!tab?.id) {
    showNotification(
      translate(loc, 'notifyScreenshotErrorTitle'),
      translate(loc, 'notifyNoActiveTab')
    );
    return;
  }

  const url = tab.url || tab.pendingUrl || '';
  if (isProtectedUrl(url)) {
    showNotification(
      translate(loc, 'notifyProtectedPageNoticeTitle'),
      translate(loc, 'notifyProtectedPageNoticeMsg')
    );
    return;
  }

  const tipText = translate(loc, 'areaSnipTip');

  try {
    await addActiveSnipTab(tab.id);
    await browser.tabs.sendMessage(tab.id, { action: 'startAreaSnip', tipText });
  } catch {
    // Inject runtime content script on demand
    try {
      await browser.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['/content-scripts/area-selector.js'],
      });
      await browser.tabs.sendMessage(tab.id, { action: 'startAreaSnip', tipText });
    } catch (injectErr) {
      await removeActiveSnipTab(tab.id);
      if (isProtectedPageError(injectErr)) {
        showNotification(
          translate(loc, 'notifyProtectedPageNoticeTitle'),
          translate(loc, 'notifyProtectedPageNoticeMsg')
        );
      } else {
        console.error('Failed to inject area selector:', injectErr);
        showNotification(
          translate(loc, 'notifyScreenshotErrorTitle'),
          translate(loc, 'notifyInjectFailed')
        );
      }
    }
  }
}

async function handleAreaSnipCompleted(
  message: {
    rect?: {
      x: number;
      y: number;
      width: number;
      height: number;
      windowWidth?: number;
      windowHeight?: number;
    };
  },
  tab?: { id?: number; windowId?: number }
): Promise<void> {
  const rect = message.rect;
  if (
    !rect ||
    !Number.isFinite(rect.x) ||
    !Number.isFinite(rect.y) ||
    !Number.isFinite(rect.width) ||
    !Number.isFinite(rect.height) ||
    rect.width <= 0 ||
    rect.height <= 0
  ) {
    return;
  }

  const dataUrl = await captureVisibleDataUrl(tab?.windowId);
  const res = await fetch(dataUrl);
  const fullBlob = await res.blob();
  const bitmap = await createImageBitmap(fullBlob);

  const windowW =
    Number.isFinite(rect.windowWidth) && (rect.windowWidth ?? 0) > 0
      ? (rect.windowWidth as number)
      : bitmap.width;
  const windowH =
    Number.isFinite(rect.windowHeight) && (rect.windowHeight ?? 0) > 0
      ? (rect.windowHeight as number)
      : bitmap.height;
  const scaleX = bitmap.width / windowW;
  const scaleY = bitmap.height / windowH;

  const cropX = Math.max(0, Math.min(bitmap.width - 1, Math.round(rect.x * scaleX)));
  const cropY = Math.max(0, Math.min(bitmap.height - 1, Math.round(rect.y * scaleY)));
  const cropW = Math.max(1, Math.min(bitmap.width - cropX, Math.round(rect.width * scaleX)));
  const cropH = Math.max(1, Math.min(bitmap.height - cropY, Math.round(rect.height * scaleY)));

  const canvas = new OffscreenCanvas(cropW, cropH);
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    bitmap.close();
    throw new Error('Failed to create offscreen 2d context for cropping');
  }

  ctx.drawImage(bitmap, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
  bitmap.close();

  const croppedBlob = await canvas.convertToBlob({ type: 'image/png' });
  const filename = generateTimestampFilename('screenshot-area', 'png');
  await uploadBlob(croppedBlob, filename, tab);
}

async function readClipboardImageInBackground(): Promise<
  { status: 'found'; blob: Blob } | { status: 'empty' } | { status: 'unsupported' }
> {
  if (typeof navigator === 'undefined' || !navigator.clipboard?.read) {
    return { status: 'unsupported' };
  }
  try {
    if (browser.permissions?.request) {
      const granted = await browser.permissions.request({ permissions: ['clipboardRead'] });
      if (!granted) return { status: 'unsupported' };
    }
    const items = await navigator.clipboard.read();
    for (const item of items) {
      for (const type of item.types) {
        if (type.startsWith('image/')) {
          const blob = await item.getType(type);
          return { status: 'found', blob };
        }
      }
    }
    return { status: 'empty' };
  } catch {
    return { status: 'unsupported' };
  }
}

async function uploadClipboardFromTab(tab?: { id?: number; url?: string }): Promise<void> {
  try {
    // Call clipboard / openPopup before any storage await to preserve user gesture activation
    if (typeof navigator === 'undefined' || !navigator.clipboard?.read) {
      if (browser.action?.openPopup) {
        try {
          await browser.action.openPopup();
          return;
        } catch {
          // Fallback to notification below
        }
      }
      const loc = await getCurrentLocale();
      showNotification(
        translate(loc, 'notifyOpenPopupForClipboardTitle'),
        translate(loc, 'notifyOpenPopupForClipboardMsg')
      );
      return;
    }

    const result = await readClipboardImageInBackground();
    if (result.status === 'found') {
      const targetTab =
        tab?.id ? tab : (await browser.tabs.query({ active: true, currentWindow: true }))[0];
      const filename = generateTimestampFilename('clipboard', 'png');
      await uploadBlob(result.blob, filename, targetTab);
      return;
    }

    const loc = await getCurrentLocale();
    if (result.status === 'empty') {
      showNotification(
        translate(loc, 'notifyClipboardTitle'),
        translate(loc, 'notifyNoImageInClipboard')
      );
      return;
    }

    if (browser.action?.openPopup) {
      try {
        await browser.action.openPopup();
        return;
      } catch {
        // Fallback to notice
      }
    }

    showNotification(
      translate(loc, 'notifyOpenPopupForClipboardTitle'),
      translate(loc, 'notifyOpenPopupForClipboardMsg')
    );
  } catch (err) {
    console.error('Failed to handle clipboard upload:', err);
    const loc = await getCurrentLocale();
    showNotification(
      translate(loc, 'notifyClipboardTitle'),
      translate(loc, 'notifyReadClipboardFailed')
    );
  }
}

async function shortenURL(linkURL: string, tab: { id?: number } | undefined): Promise<void> {
  const { requestURL, authToken } = await browser.storage.sync.get(['requestURL', 'authToken']);
  const loc = await getCurrentLocale();

  if (!requestURL || !authToken) {
    showNotification(
      translate(loc, 'notifyConfigRequiredTitle'),
      translate(loc, 'notifyConfigRequiredMsg')
    );
    void browser.runtime.openOptionsPage();
    return;
  }

  const shortenEndpoint =
    String(requestURL).replace(/\/api\/upload\/?$/, '') + '/api/user/urls';

  const response = await fetch(shortenEndpoint, {
    method: 'POST',
    headers: {
      authorization: String(authToken),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ destination: linkURL }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Shorten failed with status:', response.status, 'Response:', errorText);
    throw new Error(`Shorten failed with status ${response.status}`);
  }

  const result = await response.json();
  const shortURL = result.url as string | undefined;
  if (!shortURL) throw new Error('No URL returned in response');

  const clipboardSuccess = await copyToClipboard(shortURL, tab?.id);
  if (clipboardSuccess) {
    showNotification(
      translate(loc, 'notifyUrlShortenedTitle'),
      translate(loc, 'notifyUrlShortenedMsg')
    );
  } else {
    showNotification(
      translate(loc, 'notifyUrlShortenedTitle'),
      translate(loc, 'notifyUrlShortenedFallbackMsg', { url: shortURL })
    );
  }
}

let menuRebuildQueue: Promise<void> = Promise.resolve();

function createContextMenu(): Promise<void> {
  menuRebuildQueue = menuRebuildQueue
    .then(() => rebuildContextMenuInternal())
    .catch((err) => {
      console.error('Failed to rebuild context menus:', err);
    });
  return menuRebuildQueue;
}

async function rebuildContextMenuInternal(): Promise<void> {
  const [{ shortenEnabled, screenshotContextMenuEnabled }, loc] = await Promise.all([
    browser.storage.sync.get(['shortenEnabled', 'screenshotContextMenuEnabled']),
    getCurrentLocale(),
  ]);

  await new Promise<void>((resolve) => browser.contextMenus.removeAll(() => resolve()));

  const createMenuItem = (createProperties: Browser.contextMenus.CreateProperties) => {
    browser.contextMenus.create(createProperties, () => {
      // Clear runtime.lastError if any browser quirk occurs
      void browser.runtime.lastError;
    });
  };

  // 1. Right click on Media
  createMenuItem({
    id: 'uploadToZipline',
    title: translate(loc, 'menuUploadToZipline'),
    contexts: ['image', 'video', 'audio'],
  });

  // 2. Right click on Link
  if (shortenEnabled) {
    createMenuItem({
      id: 'shortenURL',
      title: translate(loc, 'menuShortenURL'),
      contexts: ['link'],
    });
  }

  // 3. Right click on Page (Screenshots & Clipboard)
  const showScreenshotMenus = screenshotContextMenuEnabled !== false;
  if (showScreenshotMenus) {
    createMenuItem({
      id: 'snipArea',
      title: translate(loc, 'menuSnipArea'),
      contexts: ['page'],
    });
    createMenuItem({
      id: 'captureVisible',
      title: translate(loc, 'menuCaptureVisible'),
      contexts: ['page'],
    });
    createMenuItem({
      id: 'uploadClipboard',
      title: translate(loc, 'menuUploadClipboard'),
      contexts: ['page'],
    });
  }
}
