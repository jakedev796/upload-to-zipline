export default defineBackground(() => {
  browser.runtime.onInstalled.addListener(createContextMenu);
  browser.runtime.onStartup.addListener(createContextMenu);
  browser.runtime.onMessage.addListener((msg) => {
    if (msg && (msg as { action?: string }).action === 'rebuildMenus') {
      void createContextMenu();
    }
  });
});

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
