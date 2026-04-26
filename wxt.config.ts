import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-vue'],
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
    browser_specific_settings: {
      gecko: {
        id: 'jake@shreves.dev',
        strict_min_version: '109.0',
      },
    },
  },
});
