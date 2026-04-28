import { DEFAULT_SETTINGS, IMAGE_FORMATS, type ImageFormat } from '@/types/settings';

const CONVERTIBLE_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const IMAGE_TYPE_TO_EXTENSION: Record<string, string> = {
  'image/avif': 'avif',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};
const IMAGE_FORMAT_VALUES = new Set<string>(IMAGE_FORMATS.map((format) => format.value));

export default defineBackground(() => {
  browser.runtime.onInstalled.addListener(createContextMenu);
  browser.runtime.onStartup.addListener(createContextMenu);
  browser.runtime.onMessage.addListener((msg) => {
    if (msg && (msg as { action?: string }).action === 'rebuildMenus') {
      void createContextMenu();
    }
  });
  browser.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId === 'uploadToZipline' && info.srcUrl) {
      try {
        await uploadMedia(info.srcUrl, tab);
      } catch (err) {
        console.error('Upload failed:', err);
        showNotification(
          'Upload Failed',
          'An error occurred while uploading the file. Please check your settings and try again.'
        );
      }
    }
    if (info.menuItemId === 'shortenURL' && info.linkUrl) {
      try {
        await shortenURL(info.linkUrl, tab);
      } catch (err) {
        console.error('URL shortening failed:', err);
        showNotification(
          'Shorten Failed',
          'An error occurred while shortening the URL. Please check your settings and try again.'
        );
      }
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

async function copyToClipboard(text: string, tabId: number): Promise<boolean> {
  try {
    await browser.scripting.executeScript({
      target: { tabId },
      func: (textToCopy: string) => {
        navigator.clipboard.writeText(textToCopy).catch((err) =>
          console.error('Failed to copy to clipboard:', err)
        );
      },
      args: [text],
    });
    return true;
  } catch (err) {
    console.error('Failed to execute clipboard script:', err);
    return false;
  }
}

async function uploadMedia(mediaURL: string, tab: { id?: number } | undefined): Promise<void> {
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

  if (!requestURL || !authToken) {
    showNotification(
      'Configuration Required',
      'Please configure your Zipline settings in the extension options.'
    );
    void browser.runtime.openOptionsPage();
    return;
  }

  const blob = await fetch(mediaURL).then((r) => r.blob());
  let filename = (mediaURL.split('/').pop() ?? '').split('?')[0];
  filename = filename.replace(/[\u200B-\u200D\uFEFF]/g, '');

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
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0);
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

  const clipboardSuccess = tab?.id ? await copyToClipboard(finalURL, tab.id) : false;
  if (clipboardSuccess) {
    showNotification(
      'Upload Successful',
      'The file was uploaded successfully and the URL has been copied to your clipboard.'
    );
  } else {
    showNotification('Upload Successful', `The file was uploaded successfully. URL: ${finalURL}`);
  }
}

async function shortenURL(linkURL: string, tab: { id?: number } | undefined): Promise<void> {
  const { requestURL, authToken } = await browser.storage.sync.get(['requestURL', 'authToken']);

  if (!requestURL || !authToken) {
    showNotification(
      'Configuration Required',
      'Please configure your Zipline settings in the extension options.'
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

  const clipboardSuccess = tab?.id ? await copyToClipboard(shortURL, tab.id) : false;
  if (clipboardSuccess) {
    showNotification('URL Shortened', 'The shortened URL has been copied to your clipboard.');
  } else {
    showNotification('URL Shortened', `Shortened URL: ${shortURL}`);
  }
}

async function createContextMenu(): Promise<void> {
  await new Promise<void>((resolve) => browser.contextMenus.removeAll(() => resolve()));
  browser.contextMenus.create({
    id: 'uploadToZipline',
    title: 'Upload to Zipline',
    contexts: ['image', 'video', 'audio'],
  });
  const { shortenEnabled } = await browser.storage.sync.get(['shortenEnabled']);
  if (shortenEnabled) {
    browser.contextMenus.create({
      id: 'shortenURL',
      title: 'Shorten URL with Zipline',
      contexts: ['link'],
    });
  }
}
