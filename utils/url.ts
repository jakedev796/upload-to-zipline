export function isProtectedUrl(url?: string): boolean {
  if (!url) return false;
  const lower = url.toLowerCase();
  return (
    lower.startsWith('chrome:') ||
    lower.startsWith('chrome-extension:') ||
    lower.startsWith('chrome-untrusted:') ||
    lower.startsWith('about:') ||
    lower.startsWith('edge:') ||
    lower.startsWith('opera:') ||
    lower.startsWith('brave:') ||
    lower.startsWith('vivaldi:') ||
    lower.startsWith('moz-extension:') ||
    lower.startsWith('view-source:') ||
    lower.startsWith('devtools:') ||
    lower.includes('chrome.google.com/webstore') ||
    lower.includes('chromewebstore.google.com') ||
    lower.includes('addons.mozilla.org')
  );
}

export function isProtectedPageError(err: unknown): boolean {
  if (!err) return false;
  const msg = err instanceof Error ? err.message : String(err);
  return (
    msg.includes('chrome://') ||
    msg.includes('Cannot access a chrome') ||
    msg.includes('The extensions gallery cannot be scripted') ||
    msg.includes('Cannot access contents of the given frame') ||
    msg.includes('Missing host permission') ||
    msg.includes('cannot be scripted') ||
    msg.includes('Extension manifest must request permission') ||
    msg.includes('about:blank') ||
    msg.includes('about:')
  );
}

