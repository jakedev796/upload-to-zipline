import { defineConfig } from 'wxt';
import { resolve } from 'node:path';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  modules: ['@wxt-dev/module-vue'],
  manifestVersion: 3,
  alias: {
    '@': resolve('.'),
  },
  vite: () => ({
    plugins: [tailwindcss()],
  }),
  hooks: {
    'build:manifestGenerated': (_wxt, manifest) => {
      if (manifest.content_scripts?.length === 0) {
        delete manifest.content_scripts;
      }
    },
  },
  manifest: {
    name: 'Upload to Zipline',
    description: 'Upload media, screenshots, and clipboard to Zipline.',
    permissions: [
      'storage',
      'contextMenus',
      'activeTab',
      'clipboardWrite',
      'notifications',
      'scripting',
    ],
    optional_permissions: ['clipboardRead'],
    host_permissions: ['*://*/*'],
    action: {
      default_title: 'Upload to Zipline',
    },
    icons: {
      48: '/icon/48.png',
      128: '/icon/128.png',
    },
    commands: {
      'capture-area': {
        suggested_key: {
          default: 'Alt+Shift+S',
        },
        description: 'Capture selected area and upload to Zipline',
      },
      'capture-visible': {
        suggested_key: {
          default: 'Alt+Shift+V',
        },
        description: 'Capture visible area and upload to Zipline',
      },
      'upload-clipboard': {
        suggested_key: {
          default: 'Alt+Shift+U',
        },
        description: 'Upload image from clipboard to Zipline',
      },
    },
    browser_specific_settings: {
      gecko: {
        id: 'jake@shreves.dev',
        strict_min_version: '109.0',
        data_collection_permissions: {
          required: ['none'],
          optional: [],
        },
      } as Record<string, unknown>,
    },
  },
});
