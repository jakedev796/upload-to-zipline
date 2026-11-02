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
  manifest: {
    name: 'Upload to Zipline',
    description: 'Upload media, screenshots, and clipboard to Zipline.',
    permissions: [
      'storage',
      'contextMenus',
      'tabs',
      'activeTab',
      'clipboardWrite',
      'clipboardRead',
      'notifications',
      'scripting',
    ],
    host_permissions: ['<all_urls>'],
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
        description: '選取區域截圖並上傳至 Zipline',
      },
      'capture-visible': {
        suggested_key: {
          default: 'Alt+Shift+V',
        },
        description: '截取當前可見畫面並上傳至 Zipline',
      },
      'upload-clipboard': {
        suggested_key: {
          default: 'Alt+Shift+U',
        },
        description: '上傳剪貼簿圖片至 Zipline',
      },
    },
    browser_specific_settings: {
      gecko: {
        id: process.env.FIREFOX_EXTENSION_ID || 'jake@shreves.dev',
        strict_min_version: '109.0',
        data_collection_permissions: {
          required: ['none'],
          optional: [],
        },
      } as Record<string, unknown>,
    },
  },
});
