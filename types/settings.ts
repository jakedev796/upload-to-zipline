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
}

export const DEFAULT_SETTINGS: Settings = {
  requestURL: '',
  authToken: '',
  expiryEnabled: false,
  expiryTime: '7d',
  maxViewsEnabled: false,
  maxViews: 0,
  shortenEnabled: false,
};

export const SETTINGS_KEYS: (keyof Settings)[] = [
  'requestURL',
  'authToken',
  'expiryEnabled',
  'expiryTime',
  'maxViewsEnabled',
  'maxViews',
  'shortenEnabled',
];
