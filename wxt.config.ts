import { defineConfig } from 'wxt';
import { resolve } from 'node:path';

export default defineConfig({
  modules: ['@wxt-dev/module-vue'],
  alias: {
    '@': resolve('.'),
  },
  manifest: {
    name: 'Upload to Zipline',
    description: 'Upload media to Zipline from the right-click menu.',
    permissions: [
      'storage',
      'contextMenus',
      'activeTab',
      'clipboardWrite',
      'notifications',
      'scripting',
    ],
    host_permissions: ['*://*/*'],
    action: {
      default_title: 'Upload to Zipline',
    },
    icons: {
      48: '/icon/48.png',
      128: '/icon/128.png',
    },
    browser_specific_settings: {
      gecko: {
        id: 'jake@shreves.dev',
        strict_min_version: '109.0',
      },
    },
  },
});
