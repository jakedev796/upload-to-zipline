export const IMAGE_FORMATS = [
  { value: 'webp', label: 'WebP' },
  { value: 'avif', label: 'AVIF' },
  { value: 'jpeg', label: 'JPEG' },
  { value: 'png',  label: 'PNG'  },
] as const;

export type ImageFormat = (typeof IMAGE_FORMATS)[number]['value'];

export const EXPIRY_PRESETS = [
  { value: '1h', label: '1 hour' },
  { value: '6h', label: '6 hours' },
  { value: '1d', label: '1 day' },
  { value: '3d', label: '3 days' },
  { value: '7d', label: '7 days' },
  { value: '14d', label: '14 days' },
  { value: '30d', label: '30 days' },
  { value: '90d', label: '90 days' },
  { value: '1y', label: '1 year' },
] as const;

export interface Settings {
  requestURL: string;
  authToken: string;
  expiryEnabled: boolean;
  expiryTime: string;
  maxViewsEnabled: boolean;
  maxViews: number;
  shortenEnabled: boolean;
  imageConversionEnabled: boolean;
  imageConversionFormat: ImageFormat;
  imageConversionQuality: number;
  imageCompressionEnabled: boolean;
  imageCompressionQuality: number;
}

export const DEFAULT_SETTINGS: Settings = {
  requestURL: '',
  authToken: '',
  expiryEnabled: false,
  expiryTime: '7d',
  maxViewsEnabled: false,
  maxViews: 0,
  shortenEnabled: false,
  imageConversionEnabled: false,
  imageConversionFormat: 'webp',
  imageConversionQuality: 80,
  imageCompressionEnabled: false,
  imageCompressionQuality: 80,
};

export const SETTINGS_KEYS: (keyof Settings)[] = [
  'requestURL',
  'authToken',
  'expiryEnabled',
  'expiryTime',
  'maxViewsEnabled',
  'maxViews',
  'shortenEnabled',
  'imageConversionEnabled',
  'imageConversionFormat',
  'imageConversionQuality',
  'imageCompressionEnabled',
  'imageCompressionQuality',
];
