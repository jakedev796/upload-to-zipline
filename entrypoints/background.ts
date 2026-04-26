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
  } = await browser.storage.sync.get([
    'requestURL',
    'authToken',
    'expiryEnabled',
    'expiryTime',
    'maxViewsEnabled',
    'maxViews',
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

  const formData = new FormData();
  formData.append('file', blob, filename);

  const headers: Record<string, string> = {
    authorization: String(authToken),
    'x-zipline-format': 'random',
  };
  if (expiryEnabled && expiryTime) headers['x-zipline-deletes-at'] = String(expiryTime);
  if (maxViewsEnabled && maxViews) headers['x-zipline-max-views'] = String(maxViews);

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
