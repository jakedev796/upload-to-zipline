import { DEFAULT_SETTINGS, IMAGE_FORMATS, type ImageFormat, type Locale } from '@/types/settings';
import { addUploadHistory } from '@/composables/useHistory';
import { translate } from '@/composables/useI18n';

const CONVERTIBLE_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const IMAGE_TYPE_TO_EXTENSION: Record<string, string> = {
  'image/avif': 'avif',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};
const IMAGE_FORMAT_VALUES = new Set<string>(IMAGE_FORMATS.map((format) => format.value));

async function getCurrentLocale(): Promise<Locale> {
  try {
    const { locale } = await browser.storage.sync.get(['locale']);
    if (locale === 'en' || locale === 'zh-TW' || locale === 'ja') {
      return locale as Locale;
    }
  } catch {
    // fallback to default
  }
  return DEFAULT_SETTINGS.locale;
}

export default defineBackground(() => {
  browser.runtime.onInstalled.addListener(createContextMenu);
  browser.runtime.onStartup.addListener(createContextMenu);

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
      dpr?: number;
      dataUrl?: string;
      filename?: string;
    };

    if (!message || !message.action) return;

    if (message.action === 'rebuildMenus') {
      void createContextMenu();
    } else if (message.action === 'areaSnipCompleted' && message.rect) {
      void handleAreaSnipCompleted(message, sender.tab);
    } else if (message.action === 'captureVisible') {
      void (async () => {
        try {
          const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
          const url = await captureVisible(tab);
          sendResponse({ success: true, url });
        } catch (err: unknown) {
          const errorMsg = err instanceof Error ? err.message : String(err);
          sendResponse({ success: false, error: errorMsg });
        }
      })();
      return true;
    } else if (message.action === 'startAreaSnip') {
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
    } else if (message.action === 'uploadBlob' && message.dataUrl) {
      const dataUrl = message.dataUrl;
      const filename = message.filename;
      void (async () => {
        try {
          const res = await fetch(dataUrl);
          const blob = await res.blob();
          const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
          const url = await uploadBlob(blob, filename, tab);
          sendResponse({ success: true, url });
        } catch (err: unknown) {
          const errorMsg = err instanceof Error ? err.message : String(err);
          sendResponse({ success: false, error: errorMsg });
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
      console.error('Context menu action failed:', err);
      const loc = await getCurrentLocale();
      showNotification(
        translate(loc, 'notifyActionFailedTitle'),
        translate(loc, 'notifyActionFailedMsg')
      );
    }
  });

  browser.commands.onCommand.addListener(async (command) => {
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    try {
      if (command === 'capture-area') {
        await startAreaSnip(tab);
      } else if (command === 'capture-visible') {
        await captureVisible(tab);
      } else if (command === 'upload-clipboard') {
        await uploadClipboardFromTab(tab);
      }
    } catch (err) {
      console.error(`Command ${command} failed:`, err);
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

function getImageFormat(value: unknown): ImageFormat {
  return IMAGE_FORMAT_VALUES.has(String(value))
    ? (value as ImageFormat)
    : DEFAULT_SETTINGS.imageConversionFormat;
}

function getQuality(value: unknown, fallback: number): number {
  const quality = Number(value);
  return Number.isFinite(quality) && quality >= 1 && quality <= 100 ? quality : fallback;
}

function withImageExtension(filename: string, mimeType: string): string {
  const extension = IMAGE_TYPE_TO_EXTENSION[mimeType];
  if (!extension) return filename;

  const basename = filename.replace(/\.[^.]+$/, '') || 'upload';
  return `${basename}.${extension}`;
}

function readAscii(bytes: Uint8Array, offset: number, length: number): string {
  let value = '';
  for (let i = offset; i < offset + length; i += 1) {
    value += String.fromCharCode(bytes[i]);
  }
  return value;
}

function readUint32BigEndian(bytes: Uint8Array, offset: number): number {
  return (
    bytes[offset] * 0x1000000 +
    bytes[offset + 1] * 0x10000 +
    bytes[offset + 2] * 0x100 +
    bytes[offset + 3]
  );
}

function readUint32LittleEndian(bytes: Uint8Array, offset: number): number {
  return (
    bytes[offset] +
    bytes[offset + 1] * 0x100 +
    bytes[offset + 2] * 0x10000 +
    bytes[offset + 3] * 0x1000000
  );
}

function isAnimatedPng(bytes: Uint8Array): boolean {
  let offset = 8;
  while (offset + 8 <= bytes.length) {
    const length = readUint32BigEndian(bytes, offset);
    const type = readAscii(bytes, offset + 4, 4);
    if (type === 'acTL') return true;
    if (type === 'IDAT' || type === 'IEND') return false;
    offset += 12 + length;
  }
  return false;
}

function isAnimatedWebp(bytes: Uint8Array): boolean {
  if (readAscii(bytes, 0, 4) !== 'RIFF' || readAscii(bytes, 8, 4) !== 'WEBP') return false;
  let offset = 12;
  while (offset + 8 <= bytes.length) {
    const type = readAscii(bytes, offset, 4);
    const length = readUint32LittleEndian(bytes, offset + 4);
    if (type === 'ANIM') return true;
    offset += 8 + length + (length % 2);
  }
  return false;
}

async function isConvertibleImage(blob: Blob): Promise<boolean> {
  if (!CONVERTIBLE_IMAGE_TYPES.has(blob.type)) return false;
  if (blob.type === 'image/jpeg') return true;

  const bytes = new Uint8Array(await blob.arrayBuffer());
  if (blob.type === 'image/png') return !isAnimatedPng(bytes);
  if (blob.type === 'image/webp') return !isAnimatedWebp(bytes);

  return false;
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

async function generateThumbnail(blob: Blob): Promise<string | undefined> {
  try {
    if (!blob.type.startsWith('image/')) return undefined;
    const bitmap = await createImageBitmap(blob);
    const maxDim = 120;
    let w = bitmap.width;
    let h = bitmap.height;
    if (w > h) {
      if (w > maxDim) {
        h = Math.round((h * maxDim) / w);
        w = maxDim;
      }
    } else {
      if (h > maxDim) {
        w = Math.round((w * maxDim) / h);
        h = maxDim;
      }
    }
    const canvas = new OffscreenCanvas(w, h);
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close();
    const thumbBlob = await canvas.convertToBlob({ type: 'image/webp', quality: 0.6 });
    return new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(thumbBlob);
    });
  } catch {
    return undefined;
  }
}

function generateTimestampFilename(prefix = 'screenshot', ext = 'png'): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const dateStr = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  return `${prefix}-${dateStr}.${ext}`;
}

export async function uploadBlob(
  blob: Blob,
  preferredFilename?: string,
  tab?: { id?: number }
): Promise<string> {
  const {
    requestURL,
    authToken,
    expiryEnabled,
    expiryTime,
    maxViewsEnabled,
    maxViews,
    imageConversionEnabled,
    imageConversionFormat,
    imageConversionQuality,
    imageCompressionEnabled,
    imageCompressionQuality,
  } = await browser.storage.sync.get([
    'requestURL',
    'authToken',
    'expiryEnabled',
    'expiryTime',
    'maxViewsEnabled',
    'maxViews',
    'imageConversionEnabled',
    'imageConversionFormat',
    'imageConversionQuality',
    'imageCompressionEnabled',
    'imageCompressionQuality',
  ]);

  const loc = await getCurrentLocale();

  if (!requestURL || !authToken) {
    showNotification(
      translate(loc, 'notifyConfigRequiredTitle'),
      translate(loc, 'notifyConfigRequiredMsg')
    );
    void browser.runtime.openOptionsPage();
    throw new Error('Missing Zipline configuration');
  }

  const filename = preferredFilename || generateTimestampFilename('upload', 'png');
  let uploadBlob = blob;
  let uploadFilename = filename;

  const canConvertImage = await isConvertibleImage(blob);
  const conversionFormat = getImageFormat(imageConversionFormat);
  const conversionQuality = getQuality(
    imageConversionQuality,
    DEFAULT_SETTINGS.imageConversionQuality
  );

  if (imageConversionEnabled && canConvertImage) {
    const bitmap = await createImageBitmap(blob);
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(bitmap, 0, 0);
      try {
        uploadBlob = await canvas.convertToBlob({
          type: `image/${conversionFormat}`,
          quality: conversionQuality / 100,
        });
        uploadFilename = withImageExtension(uploadFilename, uploadBlob.type);
      } finally {
        bitmap.close();
      }
    }
  }

  const formData = new FormData();
  formData.append('file', uploadBlob, uploadFilename);

  const headers: Record<string, string> = {
    authorization: String(authToken),
    'x-zipline-format': 'random',
  };
  if (expiryEnabled && expiryTime) headers['x-zipline-deletes-at'] = String(expiryTime);
  if (maxViewsEnabled && maxViews) headers['x-zipline-max-views'] = String(maxViews);
  const clientConversionApplied = uploadBlob !== blob;
  if (imageCompressionEnabled && !clientConversionApplied) {
    headers['x-zipline-image-compression-percent'] = String(
      getQuality(imageCompressionQuality, DEFAULT_SETTINGS.imageCompressionQuality)
    );
  }

  const response = await fetch(String(requestURL), { method: 'POST', headers, body: formData });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Upload failed with status:', response.status, 'Response:', errorText);
    throw new Error(`Upload failed with status ${response.status}`);
  }

  const result = await response.json();
  if (!result.files || result.files.length === 0) {
    throw new Error('No files returned in response');
  }

  const firstFile = result.files[0];
  let finalURL: string;
  if (typeof firstFile === 'string') {
    finalURL = firstFile;
  } else if (firstFile && typeof firstFile === 'object' && firstFile.url) {
    finalURL = firstFile.url;
  } else {
    throw new Error('Invalid file response format');
  }

  if (String(requestURL).startsWith('https') && finalURL.startsWith('http:')) {
    finalURL = finalURL.replace(/^http:/, 'https:');
  }

  if (!/^https?:\/\//i.test(finalURL)) {
    throw new Error('Invalid URL returned by server: only HTTP/HTTPS protocols are allowed');
  }

  // Copy to clipboard
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

  // Save to recent upload history
  void (async () => {
    const thumbnail = await generateThumbnail(uploadBlob);
    await addUploadHistory({
      url: finalURL,
      filename: uploadFilename,
      timestamp: Date.now(),
      thumbnail,
      size: uploadBlob.size,
    });
  })();

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

function isProtectedUrl(url?: string): boolean {
  if (!url) return false;
  const lower = url.toLowerCase();
  return (
    lower.startsWith('chrome:') ||
    lower.startsWith('chrome-extension:') ||
    lower.startsWith('chrome-untrusted:') ||
    lower.startsWith('about:') ||
    lower.startsWith('edge:') ||
    lower.startsWith('opera:') ||
    lower.startsWith('brave:') ||
    lower.startsWith('vivaldi:') ||
    lower.startsWith('moz-extension:') ||
    lower.startsWith('view-source:') ||
    lower.startsWith('devtools:') ||
    lower.includes('chrome.google.com/webstore') ||
    lower.includes('chromewebstore.google.com') ||
    lower.includes('addons.mozilla.org')
  );
}

function isProtectedPageError(err: unknown): boolean {
  if (!err) return false;
  const msg = err instanceof Error ? err.message : String(err);
  return (
    msg.includes('chrome://') ||
    msg.includes('Cannot access a chrome') ||
    msg.includes('The extensions gallery cannot be scripted') ||
    msg.includes('Cannot access contents of the given frame') ||
    msg.includes('Missing host permission') ||
    msg.includes('cannot be scripted') ||
    msg.includes('Extension manifest must request permission') ||
    msg.includes('about:blank') ||
    msg.includes('about:')
  );
}

async function captureVisible(tab?: { id?: number; windowId?: number; url?: string }): Promise<string> {
  const loc = await getCurrentLocale();
  if (isProtectedUrl(tab?.url)) {
    showNotification(
      translate(loc, 'notifyProtectedPageNoticeTitle'),
      translate(loc, 'notifyProtectedPageNoticeMsg')
    );
    throw new Error(translate(loc, 'notifyProtectedPageNoticeMsg'));
  }
  try {
    const dataUrl = await captureVisibleDataUrl(tab?.windowId);
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    const filename = generateTimestampFilename('screenshot-visible', 'png');
    return await uploadBlob(blob, filename, tab);
  } catch (err) {
    if (isProtectedPageError(err)) {
      showNotification(
        translate(loc, 'notifyProtectedPageNoticeTitle'),
        translate(loc, 'notifyProtectedPageNoticeMsg')
      );
      throw new Error(translate(loc, 'notifyProtectedPageNoticeMsg'));
    }
    throw err;
  }
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
    await browser.tabs.sendMessage(tab.id, { action: 'startAreaSnip', tipText });
  } catch {
    // If content script was not ready, inject dynamically
    try {
      await browser.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['/content-scripts/area-selector.js'],
      });
      await browser.tabs.sendMessage(tab.id, { action: 'startAreaSnip', tipText });
    } catch (injectErr) {
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
    dpr?: number;
  },
  tab?: { id?: number; windowId?: number }
): Promise<void> {
  const rect = message.rect;
  if (!rect || rect.width <= 0 || rect.height <= 0) return;

  const dataUrl = await captureVisibleDataUrl(tab?.windowId);
  const res = await fetch(dataUrl);
  const fullBlob = await res.blob();
  const bitmap = await createImageBitmap(fullBlob);

  const windowW = rect.windowWidth || bitmap.width;
  const windowH = rect.windowHeight || bitmap.height;
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

async function readClipboardImageInBackground(): Promise<Blob | null> {
  if (typeof navigator === 'undefined' || !navigator.clipboard?.read) return null;
  try {
    const items = await navigator.clipboard.read();
    for (const item of items) {
      for (const type of item.types) {
        if (type.startsWith('image/')) {
          return await item.getType(type);
        }
      }
    }
  } catch {
    // Not supported or denied in background context
  }
  return null;
}

async function uploadClipboardFromTab(tab?: { id?: number; url?: string }): Promise<void> {
  const loc = await getCurrentLocale();

  try {
    // 1. Try reading directly in background context (works in Firefox with clipboardRead permission)
    const bgBlob = await readClipboardImageInBackground();
    if (bgBlob) {
      const filename = generateTimestampFilename('clipboard', 'png');
      await uploadBlob(bgBlob, filename, tab);
      return;
    }

    if (!tab?.id) {
      showNotification(
        translate(loc, 'notifyClipboardTitle'),
        translate(loc, 'notifyNoActiveTab')
      );
      return;
    }

    if (isProtectedUrl(tab.url)) {
      showNotification(
        translate(loc, 'notifyProtectedPageNoticeTitle'),
        translate(loc, 'notifyProtectedPageNoticeMsg')
      );
      return;
    }

    // 2. Fallback to reading via active tab content script (works in Chrome MV3 service worker)
    const results = await browser.scripting.executeScript({
      target: { tabId: tab.id },
      func: async () => {
        try {
          const items = await navigator.clipboard.read();
          for (const item of items) {
            for (const type of item.types) {
              if (type.startsWith('image/')) {
                const blob = await item.getType(type);
                return new Promise<string>((resolve) => {
                  const reader = new FileReader();
                  reader.onloadend = () => resolve(reader.result as string);
                  reader.readAsDataURL(blob);
                });
              }
            }
          }
          return null;
        } catch {
          return null;
        }
      },
    });

    const dataUrl = results?.[0]?.result as string | null;
    if (!dataUrl) {
      showNotification(
        translate(loc, 'notifyClipboardTitle'),
        translate(loc, 'notifyNoImageInClipboard')
      );
      return;
    }

    const res = await fetch(dataUrl);
    const blob = await res.blob();
    const filename = generateTimestampFilename('clipboard', 'png');
    await uploadBlob(blob, filename, tab);
  } catch (err) {
    if (isProtectedPageError(err)) {
      showNotification(
        translate(loc, 'notifyProtectedPageNoticeTitle'),
        translate(loc, 'notifyProtectedPageNoticeMsg')
      );
    } else {
      console.error('Failed to read clipboard:', err);
      showNotification(
        translate(loc, 'notifyClipboardTitle'),
        translate(loc, 'notifyReadClipboardFailed')
      );
    }
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
