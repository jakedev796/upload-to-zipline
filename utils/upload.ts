import { DEFAULT_SETTINGS, IMAGE_FORMATS, type ImageFormat } from '@/types/settings';
import { addUploadHistory } from '@/composables/useHistory';

const CONVERTIBLE_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const IMAGE_TYPE_TO_EXTENSION: Record<string, string> = {
  'image/avif': 'avif',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};
const IMAGE_FORMAT_VALUES = new Set<string>(IMAGE_FORMATS.map((format) => format.value));
const ALLOWED_MEDIA_EXTENSIONS = /\.(avif|bmp|flac|gif|ico|jpe?g|m4a|m4v|mkv|mov|mp3|mp4|oga|ogg|ogv|opus|png|svg|tif?f|wav|weba|webm|webp)$/i;

export class MissingConfigError extends Error {
  constructor() {
    super('Missing Zipline configuration');
    this.name = 'MissingConfigError';
  }
}

export function isAllowedMediaFile(file: File): boolean {
  if (
    file.type.startsWith('image/') ||
    file.type.startsWith('video/') ||
    file.type.startsWith('audio/')
  ) {
    return true;
  }
  if (!file.type && ALLOWED_MEDIA_EXTENSIONS.test(file.name)) {
    return true;
  }
  return false;
}

export function generateTimestampFilename(prefix = 'screenshot', ext = 'png'): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const dateStr = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  return `${prefix}-${dateStr}.${ext}`;
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
    if (!ctx) {
      bitmap.close();
      return undefined;
    }
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

export async function uploadToZipline(
  blob: Blob,
  preferredFilename?: string
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

  if (!requestURL || !authToken) {
    throw new MissingConfigError();
  }

  const filename = preferredFilename || generateTimestampFilename('upload', 'png');
  let finalBlob = blob;
  let finalFilename = filename;

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
        finalBlob = await canvas.convertToBlob({
          type: `image/${conversionFormat}`,
          quality: conversionQuality / 100,
        });
        finalFilename = withImageExtension(finalFilename, finalBlob.type);
      } finally {
        bitmap.close();
      }
    } else {
      bitmap.close();
    }
  }

  const formData = new FormData();
  formData.append('file', finalBlob, finalFilename);

  const headers: Record<string, string> = {
    authorization: String(authToken),
    'x-zipline-format': 'random',
  };
  if (expiryEnabled && expiryTime) headers['x-zipline-deletes-at'] = String(expiryTime);
  if (maxViewsEnabled && maxViews) headers['x-zipline-max-views'] = String(maxViews);
  const clientConversionApplied = finalBlob !== blob;
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

  // Save to recent upload history
  void (async () => {
    const thumbnail = await generateThumbnail(finalBlob);
    await addUploadHistory({
      url: finalURL,
      filename: finalFilename,
      timestamp: Date.now(),
      thumbnail,
      size: finalBlob.size,
    });
  })();

  return finalURL;
}

